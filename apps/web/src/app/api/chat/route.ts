import type { NextRequest } from "next/server";
import { streamText, tool } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/bedrock-client";
import type { WeeklyCalendar, ChatMessage } from "@organizaTUM/shared";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import { ensureSession, getCalendar, saveCalendar, saveMessages, getProfile, getIdentity } from "@/lib/db";

export const runtime = "nodejs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Schema used by all four tools
const BlockInput = z.object({
  type: z.enum(["lecture", "uebung", "study", "meal", "break", "leisure", "exercise", "commitment"]),
  title: z.string().describe("Activity name, e.g. 'Linear Algebra', 'Study: LA', 'Lunch'"),
  dayOfWeek: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  startTime: z.string().describe("HH:MM in 24h format"),
  endTime: z.string().describe("HH:MM in 24h format"),
  location: z.string().optional(),
  courseId: z.string().optional(),
  isFixed: z.boolean().optional().describe("true for lectures and fixed commitments"),
});

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { messages?: unknown; sessionId?: string };

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : crypto.randomUUID();

  // Parse messages safely
  const rawMessages: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : []).flatMap(
    (m: unknown) => {
      if (
        typeof m === "object" &&
        m !== null &&
        "role" in m &&
        "content" in m &&
        typeof (m as Record<string, unknown>).role === "string" &&
        typeof (m as Record<string, unknown>).content === "string"
      ) {
        const role = (m as Record<string, unknown>).role as string;
        if (role === "user" || role === "assistant" || role === "system") {
          return [{ role, content: (m as Record<string, unknown>).content } as ChatMessage];
        }
      }
      return [];
    },
  );

  await ensureSession(sessionId);

  const [existingCalendar, profile, identity] = await Promise.all([
    getCalendar(sessionId),
    getProfile(sessionId),
    getIdentity(sessionId),
  ]);

  // ── Build system prompt ───────────────────────────────────────────────────

  const studentName = identity?.fullName ?? profile?.name ?? "Student";

  const prefsLines = profile
    ? [
        `Learning style: ${profile.learningStyle === "spaced-repetition" ? "spaced repetition (many short sessions)" : "deep sessions (long focused blocks)"}`,
        `Wake up: ${profile.wakeUpTime}  |  Sleep: ${profile.sleepTime}`,
        `Preferred study time: ${profile.preferredStudyTime}`,
        `Weekend: ${profile.weekendPreference === "free" ? "free (no studying)" : profile.weekendPreference === "light" ? "light (max 2h/day)" : "full (like weekdays)"}`,
        `Max study hours/day: ${profile.maxDailyStudyHours}h`,
      ].join("\n")
    : "No preferences recorded yet.";

  const calendarLines = existingCalendar
    ? existingCalendar.blocks
        .map(
          (b) =>
            `[${b.id}] ${b.type.padEnd(12)} "${b.title}" ${b.dayOfWeek} ${b.startTime}–${b.endTime}${b.location ? `  @${b.location}` : ""}`,
        )
        .join("\n")
    : "No schedule exists yet.";

  const SYSTEM = `You are OrganizaTUM, a scheduling assistant for TUM (Munich) students.
You help students build and adjust their weekly study schedule through conversation.

━━━ STUDENT ━━━
Name: ${studentName}
${prefsLines}

━━━ CURRENT SCHEDULE ━━━
${calendarLines}

━━━ YOUR TOOLS ━━━
• generate_schedule — build a complete new weekly schedule from scratch.
• add_block         — add one new block to the existing schedule.
• update_block      — modify an existing block (use the ID shown above).
• remove_block      — delete a block (use the ID shown above).

━━━ RULES ━━━
First time (no schedule): ask ONE question — what courses are they taking? Then call generate_schedule immediately.
Schedule exists: use targeted tools for each change. Confirm in one sentence.

When generating schedules:
- Respect wake/sleep times. Never schedule before wake-up or after sleep.
- Lectures/Übungen → isFixed: true. Put them on the correct days/times.
- Study blocks: 60–120 min each, spread across the week matching preferred study time.
- Harder courses get more study hours.
- Lunch 12:00–13:00, Dinner 18:00–19:00 (meal blocks).
- 15-min break after every 90 min of study.
- At least one leisure/exercise block per day.
- Weekend: respect weekend preference.
- Aim for 35–50 blocks total.
- Always respond with a short confirmation message after using tools.`;

  // ── Stream setup ──────────────────────────────────────────────────────────

  let currentCalendar: WeeklyCalendar | null = existingCalendar;
  let calendarWasUpdated = false;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line));

      // Send session ID immediately so the client can persist it
      send(`2:${JSON.stringify([{ type: "sessionId", payload: sessionId }])}\n`);

      try {
        const result = streamText({
          model: getModel(),
          system: SYSTEM,
          messages: rawMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          maxSteps: 5,
          tools: {
            // ── generate_schedule ──────────────────────────────────────────
            generate_schedule: tool({
              description:
                "Generate a brand-new complete weekly schedule. Use this when no schedule exists, or when the user asks to redo/regenerate the whole schedule.",
              parameters: z.object({
                studentName: z.string(),
                blocks: z.array(BlockInput).describe("All blocks for the week, 35-50 recommended"),
              }),
              execute: async ({ studentName, blocks }) => {
                // Signal the client to show the skeleton/loading state
                send(`2:${JSON.stringify([{ type: "phase", payload: "scheduling" }])}\n`);

                const weekStart = mondayOfCurrentWeek();
                const studyHours = blocks
                  .filter((b) => b.type === "study")
                  .reduce((sum, b) => {
                    const [sh = 0, sm = 0] = b.startTime.split(":").map(Number);
                    const [eh = 0, em = 0] = b.endTime.split(":").map(Number);
                    return sum + (eh * 60 + em - (sh * 60 + sm)) / 60;
                  }, 0);

                const calendar = WeeklyCalendarSchema.safeParse({
                  id: crypto.randomUUID(),
                  weekStart,
                  blocks: blocks.map((b) => ({
                    id: crypto.randomUUID(),
                    type: b.type,
                    title: b.title,
                    dayOfWeek: b.dayOfWeek,
                    startTime: b.startTime,
                    endTime: b.endTime,
                    location: b.location ?? undefined,
                    courseId: b.courseId ?? undefined,
                    isFixed: b.isFixed ?? (b.type === "lecture" || b.type === "uebung"),
                  })),
                  metadata: {
                    generatedAt: new Date().toISOString(),
                    studentName,
                    totalStudyHours: Math.round(studyHours * 10) / 10,
                    version: 1,
                  },
                });

                if (!calendar.success) {
                  console.error("[generate_schedule] parse error:", calendar.error.flatten());
                  return "Error: the generated schedule had invalid data. Please try again.";
                }

                currentCalendar = calendar.data;
                calendarWasUpdated = true;
                await saveCalendar(sessionId, calendar.data);
                return `Schedule created: ${blocks.length} blocks, ${studyHours.toFixed(1)}h study/week.`;
              },
            }),

            // ── add_block ──────────────────────────────────────────────────
            add_block: tool({
              description: "Add one new block to the existing schedule.",
              parameters: BlockInput,
              execute: async (b) => {
                if (!currentCalendar) return "No schedule exists yet — call generate_schedule first.";
                const newBlock = {
                  id: crypto.randomUUID(),
                  type: b.type,
                  title: b.title,
                  dayOfWeek: b.dayOfWeek,
                  startTime: b.startTime,
                  endTime: b.endTime,
                  location: b.location ?? undefined,
                  courseId: b.courseId ?? undefined,
                  isFixed: b.isFixed ?? false,
                };
                currentCalendar = { ...currentCalendar, blocks: [...currentCalendar.blocks, newBlock] };
                calendarWasUpdated = true;
                await saveCalendar(sessionId, currentCalendar);
                return `Added "${b.title}" on ${b.dayOfWeek} ${b.startTime}–${b.endTime}.`;
              },
            }),

            // ── update_block ───────────────────────────────────────────────
            update_block: tool({
              description:
                "Update fields on an existing block. Use the exact block ID from the schedule shown in your context.",
              parameters: z.object({
                blockId: z.string().describe("Exact ID of the block to update"),
                updates: BlockInput.partial().describe("Only the fields you want to change"),
              }),
              execute: async ({ blockId, updates }) => {
                if (!currentCalendar) return "No schedule yet.";
                const block = currentCalendar.blocks.find((b) => b.id === blockId);
                if (!block) return `Block "${blockId}" not found. Check the IDs in your context.`;
                currentCalendar = {
                  ...currentCalendar,
                  blocks: currentCalendar.blocks.map((b) =>
                    b.id === blockId ? { ...b, ...updates } : b,
                  ),
                };
                calendarWasUpdated = true;
                await saveCalendar(sessionId, currentCalendar);
                return `Updated "${block.title}".`;
              },
            }),

            // ── remove_block ───────────────────────────────────────────────
            remove_block: tool({
              description: "Remove a block from the schedule by its ID.",
              parameters: z.object({
                blockId: z.string().describe("Exact ID of the block to remove"),
              }),
              execute: async ({ blockId }) => {
                if (!currentCalendar) return "No schedule yet.";
                const block = currentCalendar.blocks.find((b) => b.id === blockId);
                if (!block) return `Block "${blockId}" not found.`;
                currentCalendar = {
                  ...currentCalendar,
                  blocks: currentCalendar.blocks.filter((b) => b.id !== blockId),
                };
                calendarWasUpdated = true;
                await saveCalendar(sessionId, currentCalendar);
                return `Removed "${block.title}".`;
              },
            }),
          },
        });

        // Stream text chunks to the client
        for await (const chunk of result.textStream) {
          send(`0:${JSON.stringify(chunk)}\n`);
        }

        // After all text, flush calendar update if any tool changed it
        if (calendarWasUpdated && currentCalendar) {
          send(`2:${JSON.stringify([{ type: "calendar", payload: currentCalendar }])}\n`);
          send(`2:${JSON.stringify([{ type: "phase", payload: "done" }])}\n`);
        }

        send(`d:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 } })}\n`);

        void saveMessages(sessionId, rawMessages).catch(() => {});
      } catch (err) {
        console.error("[chat] error:", err);
        send(`0:${JSON.stringify("Something went wrong. Please try again.")}\n`);
        send(`d:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 } })}\n`);
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
