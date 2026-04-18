import type { NextRequest } from "next/server";
import { ChatRequestSchema } from "@organizaTUM/shared";
import { runGraph } from "@/agent/graph";
import {
  ensureSession,
  getProfile,
  getNotes,
  getCourseAnalysis,
  saveProfile,
  saveCalendar,
  saveMessages,
  saveCourseAnalysis,
} from "@/lib/db";
import { extractAndSaveNotes } from "@/lib/note-extraction";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { messages, userProfile, sessionId: incomingSessionId } = parsed.data;
  const sessionId = incomingSessionId ?? crypto.randomUUID();

  await ensureSession(sessionId);

  const [resolvedProfile, userNotes, cachedAnalysis] = await Promise.all([
    userProfile ?? getProfile(sessionId),
    getNotes(sessionId),
    getCourseAnalysis(sessionId),
  ]);

  const requestWithContext = {
    ...parsed.data,
    userProfile: resolvedProfile ?? undefined,
    userNotes,
    courseAnalysis: cachedAnalysis ?? undefined,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (s: string) => controller.enqueue(encoder.encode(s));

      try {
        const result = await runGraph(requestWithContext, (chunk) => {
          enqueue(`0:${JSON.stringify(chunk)}\n`);
        });

        if (result.userProfile) {
          await saveProfile(sessionId, result.userProfile);
        }
        if (result.calendar) {
          await saveCalendar(sessionId, result.calendar);
        }
        if (result.courseAnalysis) {
          await saveCourseAnalysis(sessionId, result.courseAnalysis);
        }

        // Save only new messages from this turn
        const newMessages = messages.slice(-(messages.length));
        void saveMessages(sessionId, newMessages).catch(() => {});

        enqueue(`2:${JSON.stringify([{ type: "sessionId", payload: sessionId }])}\n`);
        enqueue(`2:${JSON.stringify([{ type: "phase", payload: result.currentPhase }])}\n`);

        if (result.calendar) {
          enqueue(`2:${JSON.stringify([{ type: "calendar", payload: result.calendar }])}\n`);
        }

        enqueue(`d:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 } })}\n`);

        const source = result.currentPhase === "refinement" ? "refinement" : "onboarding";
        void extractAndSaveNotes(sessionId, messages, source).catch((err) =>
          console.error("[notes] extraction failed:", err),
        );
      } catch (err) {
        console.error("[chat] agent error:", err);
        enqueue(`0:${JSON.stringify("Sorry, something went wrong. Please try again.")}\n`);
        enqueue(`d:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 } })}\n`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
