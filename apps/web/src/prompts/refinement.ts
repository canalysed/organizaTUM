import type { WeeklyCalendar, RefinementRequest } from "@organizaTUM/shared";

export function refinementProposePrompt(
  calendar: WeeklyCalendar,
  request: RefinementRequest,
): string {
  return `You are a scheduling assistant helping a TUM student adjust their weekly schedule.

Current schedule: ${calendar.blocks.length} blocks, version ${calendar.metadata.version}.
Student: ${calendar.metadata.studentName}

The student's request (type: ${request.type}):
"${request.message}"
${request.targetBlockTitle ? `Regarding block: "${request.targetBlockTitle}"` : ""}

Your task: Describe clearly what changes you would make to address this request. Be specific — mention which blocks you would move, add, or remove, and the new times/days. Then ask the student to confirm.

Rules for any change you propose:
- Never move or remove blocks where isFixed = true (lectures)
- No time overlaps on the same day
- Daily study load must stay at or below 10 hours

End your message with a short confirmation question such as "Shall I apply these changes?" Do not use em dashes (—). Do not make any changes yet — just describe and ask.`;
}

export function refinementApplyPrompt(
  calendar: WeeklyCalendar,
  proposal: string,
): string {
  return `You are a scheduling assistant. The student confirmed the following changes to their weekly schedule.

Current schedule: ${calendar.blocks.length} blocks, version ${calendar.metadata.version}.

Your previous proposal (which the student approved):
"${proposal}"

Apply exactly those changes now using the available calendar tools. Use listBlocks first if you need block IDs. After applying, confirm what you did in one short friendly sentence. Do not use em dashes (—).

Rules that must hold after your changes:
- Blocks where isFixed = true are lectures — never move or remove them
- No time overlaps allowed on the same day
- Daily study load must stay at or below 10 hours`;
}

export function refinementRejectedPrompt(): string {
  return `You are a scheduling assistant. The student did not want the changes you proposed.

Ask them what they would prefer instead — in one short, friendly sentence. Do not suggest alternatives unprompted; let them guide you. Do not use em dashes (—).`;
}
