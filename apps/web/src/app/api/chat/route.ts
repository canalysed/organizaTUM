import type { NextRequest } from "next/server";
import { streamText, tool, createDataStreamResponse } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/bedrock-client";
import type { WeeklyCalendar, ChatMessage } from "@organizaTUM/shared";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import {
  ensureSession,
  getCalendar,
  saveCalendar,
  saveMessages,
  getIdentity,
} from "@/lib/db";

export const runtime = "nodejs";

const BlockSchema = z.object({
  type: z
    .enum(["lecture", "uebung", "study", "meal", "break", "leisure", "exercise", "commitment"])
    .describe("Type of activity"),
  title: z.string().describe("Activity name (e.g. 'Linear Algebra', 'Lunch', 'Study: LA')"),
  dayOfWeek: z.enum([
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ]),
  startTime: z.string().describe("Start time in HH:MM 24h format"),
  endTime: z.string().describe("End time in HH:MM 24h format"),
  location: z.string().optional().describe("Room or building"),
  courseId: z.string().optional().describe("Short course identifier"),
  isFixed: z.boolean().optional().describe("True for lectures/commitments that cannot be moved"),
});

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
    sessionId?: string;
  };

  const sessionId = body.sessionId ?? crypto.randomUUID();
  const rawMessages: ChatMessage[] = (body.messages ?? []).filter(
    (m): m is ChatMessage =>
      (m.role === "user" || m.role === "assistant" || m.role === "system") &&
      typeof m.content === "string",
  );

  await ensureSession(sessionId);

  const [existingCalendar, identity] = await Promise.all([
    getCalendar(sessionId),
    getIdentity(sessionId),
  ]);

  const calendarSummary = existingCalendar
    ? `Current schedule has ${existingCalendar.blocks.length} blocks:\n${existingCalendar.blocks
        .map(
          (b) =>
            `  [${b.id}] ${b.title} (${b.type}) ${b.dayOfWeek} ${b.startTime}-${b.endTime}${b.location ? ` @ ${b.location}` : ""}`,
        )
        .join("\n")}`
    : "No schedule exists yet.";

  const systemPrompt = `You are OrganizaTUM, a friendly AI scheduling assistant for TUM (Technical University of Munich) students. Your job is to create a personalized weekly study schedule through conversation, then refine it on request.

## Onboarding flow (first time, no schedule):
1. Greet the user and ask their name and which courses they are taking this semester.
2. Ask 1-2 follow-up questions maximum: preferred wake/sleep time, any fixed commitments (sport, club), whether they eat at Mensa.
3. As soon as you have a name and at least one course, call generate_schedule. Do not wait for perfect information.
4. After generating, describe the schedule in 2-3 sentences and offer to adjust it.

## Refinement (schedule exists):
- For any change request (move a block, add/remove something, reschedule), use add_block, update_block, or remove_block.
- Confirm each change in one short sentence.
- When the user says "regenerate" or "redo the whole schedule", call generate_schedule again.

## Schedule generation rules:
- Lectures/Uebungen are fixed (isFixed: true). Put them on the correct days/times.
- Study blocks: 60-120 min each, spread Mon-Fri. Harder courses get more study time.
- Meals: lunch 12:00-13:00, dinner 18:00-19:00 (only if eating Mensa).
- Short break (15 min) after every 90 min of study.
- Leisure/exercise: at least one block per day, preferably evening or weekend.
- Respect wake and sleep times. Never schedule past midnight.
- Weekend: lighter workload (leisure, 1-2 study blocks max).
- Aim for 30-50 blocks total for a full realistic week.

## Current state:
Student: ${identity?.fullName ?? "not yet known"}
${calendarSummary}
`;

  return createDataStreamResponse({
    execute: async (dataStream) => {
      dataStream.writeData({ type: "sessionId", payload: sessionId });

      let workingCalendar: WeeklyCalendar | null = existingCalendar;

      const result = streamText({
        model: getModel(),
        system: systemPrompt,
        messages: rawMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        tools: {
          generate_schedule: tool({
            description:
              "Generate or completely replace the weekly schedule. Call this once you know the student's name and at least one course.",
            parameters: z.object({
              studentName: z.string().describe("Student's first name"),
              blocks: z
                .array(BlockSchema)
                .describe("All time blocks for the week (aim for 30-50 blocks)"),
            }),
            execute: async ({ studentName, blocks }) => {
              dataStream.writeData({ type: "phase", payload: "scheduling" });

              const now = new Date();
              const monday = new Date(now);
              const dow = monday.getDay();
              monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
              monday.setHours(0, 0, 0, 0);

              const studyHours = blocks
                .filter((b) => b.type === "study")
                .reduce((sum, b) => {
                  const [sh = 0, sm = 0] = b.startTime.split(":").map(Number);
                  const [eh = 0, em = 0] = b.endTime.split(":").map(Number);
                  return sum + (eh * 60 + em - (sh * 60 + sm)) / 60;
                }, 0);

              const calendar: WeeklyCalendar = {
                id: crypto.randomUUID(),
                weekStart: monday.toISOString().split("T")[0]!,
                blocks: blocks.map((b) => ({
                  id: crypto.randomUUID(),
                  type: b.type,
                  title: b.title,
                  dayOfWeek: b.dayOfWeek,
                  startTime: b.startTime,
                  endTime: b.endTime,
                  location: b.location,
                  courseId: b.courseId,
                  isFixed: b.isFixed ?? (b.type === "lecture" || b.type === "uebung"),
                  color: undefined,
                  notes: undefined,
                  date: undefined,
                })),
                metadata: {
                  generatedAt: now.toISOString(),
                  studentName,
                  totalStudyHours: Math.round(studyHours * 10) / 10,
                  version: 1,
                },
              };

              const validated = WeeklyCalendarSchema.safeParse(calendar);
              if (!validated.success) {
                console.error("[generate_schedule] invalid:", validated.error.flatten());
                return "Error: the generated schedule had invalid data. Please try again.";
              }

              workingCalendar = validated.data;
              await saveCalendar(sessionId, validated.data);
              dataStream.writeData({ type: "calendar", payload: validated.data });
              dataStream.writeData({ type: "phase", payload: "done" });

              return `Schedule created: ${blocks.length} blocks, ${studyHours.toFixed(1)}h study/week.`;
            },
          }),

          add_block: tool({
            description: "Add a single new block to the existing schedule",
            parameters: BlockSchema,
            execute: async (blockData) => {
              const current = workingCalendar ?? (await getCalendar(sessionId));
              if (!current) return "No schedule yet — use generate_schedule first.";

              const newBlock = {
                id: crypto.randomUUID(),
                ...blockData,
                isFixed: blockData.isFixed ?? false,
                color: undefined,
                notes: undefined,
                date: undefined,
              };
              const updated = { ...current, blocks: [...current.blocks, newBlock] };
              workingCalendar = updated;
              await saveCalendar(sessionId, updated);
              dataStream.writeData({ type: "calendar", payload: updated });
              return `Added "${blockData.title}" (${blockData.dayOfWeek} ${blockData.startTime}-${blockData.endTime}).`;
            },
          }),

          update_block: tool({
            description:
              "Update an existing block. Use the block ID from the current schedule state shown in your context.",
            parameters: z.object({
              blockId: z.string().describe("The exact ID of the block to update"),
              updates: BlockSchema.partial().describe("Only the fields you want to change"),
            }),
            execute: async ({ blockId, updates }) => {
              const current = workingCalendar ?? (await getCalendar(sessionId));
              if (!current) return "No schedule yet.";

              const block = current.blocks.find((b) => b.id === blockId);
              if (!block) return `Block with ID "${blockId}" not found.`;

              const updated = {
                ...current,
                blocks: current.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
              };
              workingCalendar = updated;
              await saveCalendar(sessionId, updated);
              dataStream.writeData({ type: "calendar", payload: updated });
              return `Updated "${block.title}".`;
            },
          }),

          remove_block: tool({
            description: "Remove a block from the schedule by its ID",
            parameters: z.object({
              blockId: z.string().describe("The exact ID of the block to remove"),
            }),
            execute: async ({ blockId }) => {
              const current = workingCalendar ?? (await getCalendar(sessionId));
              if (!current) return "No schedule yet.";

              const block = current.blocks.find((b) => b.id === blockId);
              if (!block) return `Block "${blockId}" not found.`;

              const updated = {
                ...current,
                blocks: current.blocks.filter((b) => b.id !== blockId),
              };
              workingCalendar = updated;
              await saveCalendar(sessionId, updated);
              dataStream.writeData({ type: "calendar", payload: updated });
              return `Removed "${block.title}".`;
            },
          }),
        },
        maxSteps: 5,
        onFinish: async () => {
          void saveMessages(sessionId, rawMessages).catch(() => {});
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
