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

export function refinementProposePrompt(
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

  return `You are a scheduling assistant for a TUM student. You have full visibility of their weekly schedule and profile.

${profileSection}

CURRENT WEEKLY SCHEDULE:
${scheduleText}

The student says: "${request.message}"

DECIDE which case applies:

CASE 1 — Informational query (e.g. "what do I have on Monday?", "how many study hours?", "which courses am I taking?", "show me my schedule"):
Answer directly from the schedule above. Be concise and friendly. Do NOT propose changes. Do NOT ask for confirmation.

CASE 2 — Modification request (e.g. "add a study session", "move my lunch break", "remove the exercise block"):
Describe specifically what you would change: which blocks, new times/days, and why it fits the student's preferences. Then end with exactly one confirmation question such as "Shall I apply these changes?" Do not make any changes yet.

Rules if proposing changes:
- Never move or remove blocks marked (fixed) — those are lectures and Uebungen
- No time overlaps on the same day
- Respect wake time ${userProfile?.wakeUpTime ?? "08:00"} and sleep time ${userProfile?.sleepTime ?? "23:00"}
- Max ${userProfile?.maxDailyStudyHours ?? 6}h study per day
Do not use em dashes (—).`;
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
- Blocks marked isFixed: true are lectures — never move or remove them
- No time overlaps allowed on the same day
- Daily study load must stay at or below 10 hours`;
}

export function refinementRejectedPrompt(): string {
  return `You are a scheduling assistant. The student did not want the changes you proposed.

Ask them what they would prefer instead — in one short, friendly sentence. Do not suggest alternatives unprompted; let them guide you. Do not use em dashes (—).`;
}
