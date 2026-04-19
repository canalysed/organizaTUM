import type { NextRequest } from "next/server";
import { ChatRequestSchema } from "@organizaTUM/shared";
import type { CourseSelection, CourseAnalysis, WeeklyCalendar } from "@organizaTUM/shared";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractCoursesFromCalendar(calendar: WeeklyCalendar): CourseSelection[] {
  const seen = new Set<string>();
  const courses: CourseSelection[] = [];
  for (const block of calendar.blocks) {
    if (!block.courseId || seen.has(block.courseId)) continue;
    seen.add(block.courseId);
    courses.push({ courseId: block.courseId, courseName: block.title });
  }
  return courses;
}

function parseTimeHours(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

function deriveAnalysisFromCalendar(calendar: WeeklyCalendar): CourseAnalysis[] {
  const courseHours = new Map<string, { name: string; contactHours: number }>();
  for (const block of calendar.blocks) {
    if (!block.courseId) continue;
    const duration = parseTimeHours(block.endTime) - parseTimeHours(block.startTime);
    const existing = courseHours.get(block.courseId) ?? {
      name: block.title,
      contactHours: 0,
    };
    courseHours.set(block.courseId, {
      name: existing.name,
      contactHours: existing.contactHours + duration,
    });
  }

  return Array.from(courseHours.entries()).map(([courseId, info]) => ({
    courseId,
    courseName: info.name,
    baseDifficulty: "medium" as const,
    adjustedDifficulty: "medium" as const,
    adjustmentReason: "Estimated from TUM Online schedule (no difficulty data available).",
    weeklyStudyHours: Math.max(2, Math.round(info.contactHours * 1.5)),
    priorityScore: 5,
  }));
}


function isRawCsvCalendar(calendar: WeeklyCalendar): boolean {
  const types = new Set(calendar.blocks.map((b) => b.type));
  return !types.has("study") && !types.has("meal") && !types.has("break") && !types.has("leisure");
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { messages, userProfile, sessionId: incomingSessionId } = parsed.data;
  const sessionId = incomingSessionId ?? crypto.randomUUID();

  await ensureSession(sessionId);

  const [resolvedProfileRaw, userNotes, cachedAnalysisRaw, existingCalendar, identity] =
    await Promise.all([
      userProfile ?? getProfile(sessionId),
      getNotes(sessionId),
      getCourseAnalysis(sessionId),
      getCalendar(sessionId),
      getIdentity(sessionId),
    ]);

  // Enrich profile with courses extracted from the CSV calendar when profile has none
  let resolvedProfile = resolvedProfileRaw ?? null;
  if (resolvedProfile && resolvedProfile.courses.length === 0 && existingCalendar) {
    const csvCourses = extractCoursesFromCalendar(existingCalendar);
    if (csvCourses.length > 0) {
      resolvedProfile = { ...resolvedProfile, courses: csvCourses };
    }
  }

  // Derive basic course analysis from CSV calendar when none is cached
  let cachedAnalysis = cachedAnalysisRaw ?? null;
  if (!cachedAnalysis && existingCalendar && isRawCsvCalendar(existingCalendar)) {
    cachedAnalysis = deriveAnalysisFromCalendar(existingCalendar);
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const refinementRequest = existingCalendar
    ? {
        type: (lastUserMsg.startsWith("[") ? "targeted" : "global") as "global" | "targeted",
        message: lastUserMsg,
        ...(lastUserMsg.startsWith("[")
          ? { targetBlockTitle: lastUserMsg.match(/^\[(.+?)\]/)?.[1] }
          : {}),
      }
    : undefined;

  const refinementMode = refinementRequest ? ("apply" as const) : undefined;

  const requestWithContext = {
    ...parsed.data,
    sessionId,
    userProfile: resolvedProfile ?? undefined,
    userNotes,
    courseAnalysis: cachedAnalysis ?? undefined,
    calendar: existingCalendar ?? undefined,
    refinementRequest,
    refinementMode,
    identityName: identity?.fullName ?? null,
    tumCourses: parsed.data.tumCourses ?? undefined,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (s: string) => controller.enqueue(encoder.encode(s));

      const onEvent = (event: AgentStreamEvent) => {
        if (event.type === "chunk") {
          enqueue(`0:${JSON.stringify(event.payload)}\n`);
        } else {
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

        void saveMessages(sessionId, messages).catch(() => {});

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
