import type { UserProfile, CourseAnalysis } from "@organizaTUM/shared";

export function schedulingPrompt(
  profile: UserProfile,
  courseAnalysis: CourseAnalysis[],
  mensaMenu: unknown,
): string {
  return `You are a scheduling expert building a personalized weekly schedule for a TUM student.

Student profile:
${JSON.stringify(profile, null, 2)}

Course analysis:
${JSON.stringify(courseAnalysis, null, 2)}

Mensa menu this week:
${JSON.stringify(mensaMenu, null, 2)}

Build a complete WeeklyCalendar following these rules:
1. Place all fixed lecture blocks first (isFixed: true)
2. Select the best Übungsklasse slot per course (avoid conflicts, optimize spacing)
3. Distribute study sessions based on learning style:
   - spaced-repetition: 1–2h sessions spread across multiple days
   - deep-session: 3–4h blocks, 2–3 days per week
4. Harder courses get proportionally more study time
5. Add meal blocks (mensa if preferred, respecting dietary restrictions)
6. Add 15–30min break blocks between intensive sessions
7. Reserve at least one leisure block per day
8. No block may overlap another. Each day: maximum 10 hours of scheduled time.

Use ISO date for weekStart. Generate UUIDs for block IDs.

Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble, no explanation outside the JSON.`;
}
