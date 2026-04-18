import type { WeeklyCalendar, RefinementRequest } from "@organizaTUM/shared";

export function refinementPrompt(
  calendar: WeeklyCalendar,
  request: RefinementRequest,
): string {
  return `You are modifying a student's weekly schedule based on their request.

Current schedule:
${JSON.stringify(calendar, null, 2)}

Modification request (type: ${request.type}):
"${request.message}"
${request.targetBlockId ? `Target block ID: ${request.targetBlockId}` : ""}
${request.targetBlockTitle ? `Target block: ${request.targetBlockTitle}` : ""}

Rules:
- For "targeted" requests: move or resize only the specified block
- For "global" requests: reschedule across the entire week to satisfy the constraint
- After modification: no overlaps allowed, daily load must remain reasonable (≤10h)
- Keep all fixed blocks (isFixed: true) in place — do not move lectures
- Preserve block IDs for existing blocks (only change times/days)
- Increment metadata.version by 1

Respond ONLY in valid JSON matching the provided WeeklyCalendar schema. No markdown, no preamble, no explanation outside the JSON.`;
}
