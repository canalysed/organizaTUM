import type { UserProfile } from "@organizaTUM/shared";

export function onboardingPrompt(
  knownName?: string,
  existingProfile?: Partial<UserProfile> | null,
): string {
  const hasCourses = (existingProfile?.courses?.length ?? 0) > 0;
  const hasLearningStyle =
    existingProfile?.learningStyle && existingProfile.learningStyle !== "unknown";
  const hasSchedulePrefs =
    existingProfile?.wakeUpTime && existingProfile.wakeUpTime !== "08:00";
  const hasWeekendPref = !!existingProfile?.weekendPreference;

  const knownFields: string[] = [];
  if (knownName) knownFields.push(`name: "${knownName}"`);
  if (hasCourses)
    knownFields.push(
      `courses: ${existingProfile!.courses!.map((c) => c.courseName).join(", ")}`,
    );
  if (hasLearningStyle)
    knownFields.push(`learning style: ${existingProfile!.learningStyle}`);
  if (hasSchedulePrefs)
    knownFields.push(
      `wake: ${existingProfile!.wakeUpTime}, sleep: ${existingProfile!.sleepTime}, preferred study time: ${existingProfile!.preferredStudyTime}`,
    );
  if (hasWeekendPref)
    knownFields.push(`weekend preference: ${existingProfile!.weekendPreference}`);

  const alreadyKnownSection =
    knownFields.length > 0
      ? `\n\nALREADY KNOWN — do NOT ask about these again:\n${knownFields.map((f) => `- ${f}`).join("\n")}`
      : "";

  const remainingFields: string[] = [];
  if (!hasCourses) remainingFields.push("courses they are taking this semester");
  if (!hasLearningStyle)
    remainingFields.push("learning style (spaced repetition or deep focused sessions)");
  if (!hasSchedulePrefs)
    remainingFields.push("wake-up time and preferred time of day to study");
  if (!hasWeekendPref)
    remainingFields.push("weekend preference (free / light studying / full study days)");
  remainingFields.push("fixed commitments (sports, jobs, clubs — if any)");
  remainingFields.push("leisure interests (sports, cinema, events — optional)");

  const remainingSection =
    remainingFields.length > 0
      ? `\n\nSTILL NEEDED (ask one at a time):\n${remainingFields.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
      : "\n\nAll required information is already known. Set isComplete to true immediately and populate profileSoFar fully.";

  return `You are OrganizaTUM, an AI scheduling assistant for TUM students. Your job is to collect the missing information needed to build a personalized weekly schedule — then set isComplete to true.

Be direct and friendly. Ask ONE question at a time. Never ask about something already known.${alreadyKnownSection}${remainingSection}

Mapping rules:
- "I wake up at 7" → wakeUpTime: "07:00"
- "morning person" → preferredStudyTime: "morning"
- "weekends free" → weekendPreference: "free"
- "light on weekends" → weekendPreference: "light"
- "study on weekends" → weekendPreference: "full"

When all required fields are collected (or already known), set isComplete: true and populate profileSoFar completely — use the already-known values for fields you did not ask about.

Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble.`;
}
