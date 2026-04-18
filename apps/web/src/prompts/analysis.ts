import type { UserProfile, Course } from "@organizaTUM/shared";

export function analysisPrompt(profile: UserProfile, courses: Course[]): string {
  return `You are an academic advisor analyzing course difficulty for a TUM student.

Student profile:
${JSON.stringify(profile, null, 2)}

Available course data:
${JSON.stringify(courses, null, 2)}

For each course the student is taking:
1. Start with the base difficulty from the course data
2. Adjust based on the student's stated strengths and weaknesses
3. Assign weekly study hours proportional to adjusted difficulty (easy: 2h, medium: 4h, hard: 6h, very-hard: 8h)
4. Assign a priority score (1–10) based on credits and difficulty

Provide a brief summary of your analysis in plain text. Do not use em dashes (—).

Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble, no explanation outside the JSON.`;
}
