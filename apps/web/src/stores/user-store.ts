import { create } from "zustand";
import type { UserProfile, AgentPhase } from "@organizaTUM/shared";

interface UserState {
  profile: UserProfile | null;
  agentPhase: AgentPhase;
  sessionId: string | null;
  setProfile: (profile: UserProfile) => void;
  setAgentPhase: (phase: AgentPhase) => void;
  setSessionId: (id: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  agentPhase: "onboarding",
  sessionId: null,
  setProfile: (profile) => set({ profile }),
  setAgentPhase: (agentPhase) => set({ agentPhase }),
  setSessionId: (sessionId) => set({ sessionId }),
}));
