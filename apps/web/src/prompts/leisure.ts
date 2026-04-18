import type { UserProfile, WeeklyCalendar } from "@organizaTUM/shared";

export function leisurePrompt(
  profile: UserProfile,
  calendar: WeeklyCalendar,
  events: unknown,
): string {
  return `You are suggesting leisure activities to fill a student's free time slots.

Student interests: ${profile.leisureInterests.join(", ")}

Current schedule (look for blocks with type "leisure" or "break"):
${JSON.stringify(calendar, null, 2)}

Available TUM events and activities this week:
${JSON.stringify(events, null, 2)}

For each leisure/break block, suggest a matching activity from the events or based on the student's interests.
Only suggest — do not force. Keep suggestions brief and friendly.

Write a warm closing message summarizing the week and the activity suggestions. Do not use em dashes (—).

Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble, no explanation outside the JSON.`;
}
