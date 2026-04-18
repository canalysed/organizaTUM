import { lookupCourses } from "@/tools/course-lookup";
import { emitThinking } from "../stream-context";
import type { AgentState } from "../state";
import type { CourseAnalysis } from "@organizaTUM/shared";

const DIFFICULTY_WEIGHT: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  "very-hard": 4,
};

const DIFFICULTY_HOURS: Record<string, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
  "very-hard": 8,
};

export async function analysisNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.userProfile) return {};

  emitThinking("Looking up course information...");
  const courses = await lookupCourses(
    state.userProfile.courses.map((c) => c.courseId),
  );

  const courseAnalyses: CourseAnalysis[] = courses.map((course) => {
    const weight = DIFFICULTY_WEIGHT[course.difficulty] ?? 2;
    const priorityScore = Math.min(10, Math.max(1, Math.round(course.credits * weight / 3)));
    return {
      courseId: course.id,
      courseName: course.name,
      baseDifficulty: course.difficulty,
      adjustedDifficulty: course.difficulty,
      adjustmentReason: `Base difficulty from course data (${course.difficulty}).`,
      weeklyStudyHours: DIFFICULTY_HOURS[course.difficulty] ?? course.weeklyStudyHoursRecommended,
      priorityScore,
    };
  });

  const summary = `Analyzed ${courses.length} course(s). Total recommended study: ${courseAnalyses.reduce((s, c) => s + c.weeklyStudyHours, 0)}h/week.`;

  return {
    courseAnalysis: courseAnalyses,
    currentPhase: "scheduling",
    messages: [{ role: "assistant", content: summary }],
  };
}
