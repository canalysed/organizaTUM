import type { NextRequest } from "next/server";
import { ChatRequestSchema } from "@organizaTUM/shared";
import { runGraph, type AgentStreamEvent } from "@/agent/graph";
import {
  ensureSession,
  getProfile,
  getNotes,
  getCourseAnalysis,
  getCalendar,
  getIdentity,
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

  const [resolvedProfile, userNotes, cachedAnalysis, existingCalendar, identity] = await Promise.all([
    userProfile ?? getProfile(sessionId),
    getNotes(sessionId),
    getCourseAnalysis(sessionId),
    getCalendar(sessionId),
    getIdentity(sessionId),
  ]);

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const refinementRequest = existingCalendar
    ? {
        type: (lastUserMsg.startsWith("[") ? "targeted" : "global") as "global" | "targeted",
        message: lastUserMsg,
      }
    : undefined;

  const requestWithContext = {
    ...parsed.data,
    userProfile: resolvedProfile ?? undefined,
    userNotes,
    courseAnalysis: cachedAnalysis ?? undefined,
    calendar: existingCalendar ?? undefined,
    refinementRequest,
    identityName: identity?.fullName ?? null,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (s: string) => controller.enqueue(encoder.encode(s));

      const onEvent = (event: AgentStreamEvent) => {
        if (event.type === "chunk") {
          enqueue(`0:${JSON.stringify(event.payload)}\n`);
        } else {
          // thinking events go through the data channel so the UI can display them
          enqueue(`2:${JSON.stringify([event])}\n`);
        }
      };

      try {
        const result = await runGraph(requestWithContext, onEvent);

        if (result.userProfile) {
          await saveProfile(sessionId, result.userProfile);
        }
        if (result.calendar) {
          await saveCalendar(sessionId, result.calendar);
        }
        if (result.courseAnalysis) {
          await saveCourseAnalysis(sessionId, result.courseAnalysis);
        }

        const newMessages = messages.slice(-(messages.length));
        void saveMessages(sessionId, newMessages).catch(() => {});

        // Emit the agent's last reply as the visible chat message
        if (result.lastMessage) {
          enqueue(`0:${JSON.stringify(result.lastMessage)}\n`);
        }

        enqueue(`2:${JSON.stringify([{ type: "sessionId", payload: sessionId }])}\n`);
        enqueue(`2:${JSON.stringify([{ type: "phase", payload: result.currentPhase }])}\n`);

        if (result.calendar) {
          enqueue(`2:${JSON.stringify([{ type: "calendar", payload: result.calendar }])}\n`);
        }

        enqueue(
          `d:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 } })}\n`,
        );

        const source = result.currentPhase === "refinement" ? "refinement" : "onboarding";
        void extractAndSaveNotes(sessionId, messages, source).catch((err) =>
          console.error("[notes] extraction failed:", err),
        );
      } catch (err) {
        console.error("[chat] agent error:", err);
        enqueue(`0:${JSON.stringify("Sorry, something went wrong. Please try again.")}\n`);
        enqueue(
          `d:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 } })}\n`,
        );
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
