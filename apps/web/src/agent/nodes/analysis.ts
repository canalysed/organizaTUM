import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/bedrock-client";
import { CourseAnalysisSchema } from "@organizaTUM/shared";
import { analysisPrompt } from "@/prompts/analysis";
import { lookupCourses } from "@/tools/course-lookup";
import type { AgentState } from "../state";

const AnalysisOutputSchema = z.object({
  courseAnalyses: z.array(CourseAnalysisSchema),
  summary: z.string(),
});

export async function analysisNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  if (!state.userProfile) return {};

  const courses = await lookupCourses(
    state.userProfile.courses.map((c) => c.courseId),
  );

  const result = await generateObject({
    model: getModel(),
    schema: AnalysisOutputSchema,
    messages: [
      { role: "system", content: analysisPrompt(state.userProfile, courses) },
    ],
  });

  return {
    courseAnalysis: result.object.courseAnalyses,
    currentPhase: "scheduling",
    messages: [{ role: "assistant", content: result.object.summary }],
  };
}
