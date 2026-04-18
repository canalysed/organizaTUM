"use client";

import type { AgentPhase } from "@organizaTUM/shared";

const PHASE_LABELS: Record<AgentPhase, string> = {
  onboarding: "Getting to know you...",
  analysis: "Analyzing your courses...",
  scheduling: "Building your schedule...",
  refinement: "Refining your schedule...",
  leisure: "Finding activities for you...",
  done: "Schedule ready!",
};

interface Props {
  phase: AgentPhase;
  isLoading: boolean;
}

export function StatusIndicator({ phase, isLoading }: Props) {
  if (!isLoading) return null;

  return (
    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
      <div className="w-3 h-3 border-2 border-tum-blue border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-tum-blue font-medium">{PHASE_LABELS[phase]}</span>
    </div>
  );
}
