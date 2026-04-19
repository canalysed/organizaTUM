import type { WeeklyCalendar, RefinementRequest, UserProfile, TimeBlock } from "@organizaTUM/shared";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function formatSchedule(blocks: TimeBlock[]): string {
  const seen = new Set<string>();
  const dayMap = new Map<string, TimeBlock[]>();

  for (const block of blocks) {
    const key = `${block.dayOfWeek}|${block.startTime}|${block.endTime}|${block.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!dayMap.has(block.dayOfWeek)) dayMap.set(block.dayOfWeek, []);
    dayMap.get(block.dayOfWeek)!.push(block);
  }

  return DAY_ORDER
    .filter((d) => dayMap.has(d))
    .map((day) => {
      const sorted = dayMap.get(day)!.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const lines = sorted.map(
        (b) =>
          `  ${b.startTime}–${b.endTime}  [${b.type}]  "${b.title}"${b.isFixed ? " (fixed)" : ""}${b.location ? ` @ ${b.location}` : ""}`,
      );
      return `${DAY_LABELS[day]}:\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

export function refinementPrompt(
  calendar: WeeklyCalendar,
  request: RefinementRequest,
  userProfile: UserProfile | null,
  identityName: string | null,
): string {
  const scheduleText = formatSchedule(calendar.blocks);
  const studentName = identityName ?? userProfile?.name ?? "the student";

  const profileSection = userProfile
    ? `Student: ${studentName}
Learning style: ${userProfile.learningStyle}
Wake/sleep: ${userProfile.wakeUpTime} – ${userProfile.sleepTime}
Max daily study: ${userProfile.maxDailyStudyHours}h/day
Preferred study time: ${userProfile.preferredStudyTime}
Weekend preference: ${userProfile.weekendPreference}
Courses: ${userProfile.courses.map((c) => c.courseName ?? c.courseId).join(", ") || "see schedule"}`
    : `Student: ${studentName}`;

  return `You are a scheduling assistant for a TUM student. You have full visibility of their weekly schedule and tools to edit it.

${profileSection}

CURRENT WEEKLY SCHEDULE:
${scheduleText}

The student says: "${request.message}"

If this is an INFORMATIONAL question (e.g. "what do I have on Monday?", "which courses am I taking?"):
Use listBlocks to get current block IDs if needed, then answer directly. Be concise and friendly. Do NOT modify the calendar.

If this is a REQUEST TO CHANGE OR ADD something:
Use the available tools to apply the changes immediately — no confirmation needed.
- Use listBlocks to get block IDs before moving/removing anything
- Use addBlock to add new blocks (study sessions, meals, breaks, etc.)
- Use moveBlock or removeBlock for adjustments
- Make all changes in one response
After applying, confirm briefly what you did (one sentence).

Rules you must always follow:
- Never move or remove blocks marked (fixed) — those are official lectures and Uebungen
- No time overlaps on the same day
- Respect wake time ${userProfile?.wakeUpTime ?? "08:00"} and sleep time ${userProfile?.sleepTime ?? "23:00"}
- Max ${userProfile?.maxDailyStudyHours ?? 6}h study per day
- If adding study sessions, distribute them sensibly around existing lectures
Do not use em dashes (—).`;
}
