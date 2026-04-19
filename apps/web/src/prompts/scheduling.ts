import type { UserProfile, CourseAnalysis, UserNote } from "@organizaTUM/shared";

export function schedulingPrompt(
  profile: UserProfile,
  courseAnalysis: CourseAnalysis[],
  mensaMenu: unknown,
  userNotes: UserNote[] = [],
): string {
  const notesSection =
    userNotes.length > 0
      ? JSON.stringify(
          userNotes.map((n) => ({ category: n.category, fact: n.content })),
          null,
          2,
        )
      : "None yet.";

  return `You are a scheduling expert building a personalized weekly schedule for a TUM student.

Student profile:
${JSON.stringify(profile, null, 2)}

Course analysis:
${JSON.stringify(courseAnalysis, null, 2)}

Mensa menu this week:
${JSON.stringify(mensaMenu, null, 2)}

Student notes and preferences from previous conversations:
${notesSection}

Build a complete WeeklyCalendar following these rules:
1. Place all fixed lecture blocks first (isFixed: true)
2. Select the best Übungsklasse slot per course (avoid conflicts, optimize spacing)
3. Respect the student's wakeUpTime and sleepTime — schedule nothing outside those bounds
4. Apply preferred study time of day (${profile.preferredStudyTime}): cluster study sessions in that part of the day
5. Distribute study sessions based on learning style:
   - spaced-repetition: 1–2h sessions spread across multiple days
   - deep-session: 3–4h blocks, 2–3 days per week
6. Respect weekendPreference:
   - free: no study blocks on Saturday/Sunday
   - light: max 2h study per weekend day
   - full: treat weekends like weekdays
7. Harder courses get proportionally more study time; max ${profile.maxDailyStudyHours}h scheduled per day
8. Add meal blocks (mensa if preferred, respecting dietary restrictions)
9. Add 15–30min break blocks between intensive sessions
10. Reserve at least one leisure block per day
11. Honor any constraints or preferences from student notes above
12. No block may overlap another.

Use ISO date for weekStart. Generate UUIDs for block IDs.
Block titles must be plain text only — no bullet points, no special symbols (◆●•▸►), no markdown. German umlauts (Ü, Ö, Ä, ü, ö, ä, ß) are allowed and expected.

Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble, no explanation outside the JSON.`;
}
