"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile, AgentPhase, UserNote, UserIdentity } from "@organizaTUM/shared";

interface UserState {
  profile: UserProfile | null;
  identity: UserIdentity | null;
  agentPhase: AgentPhase;
  sessionId: string | null;
  notes: UserNote[];
  setProfile: (profile: UserProfile) => void;
  setIdentity: (identity: UserIdentity) => void;
  setAgentPhase: (phase: AgentPhase) => void;
  setSessionId: (id: string) => void;
  setNotes: (notes: UserNote[]) => void;
  addNote: (note: UserNote) => void;
  updateNote: (id: string, updates: Partial<UserNote>) => void;
  removeNote: (id: string) => void;
  clearAll: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      identity: null,
      agentPhase: "onboarding",
      sessionId: null,
      notes: [],
      setProfile: (profile) => set({ profile }),
      setIdentity: (identity) => set({ identity }),
      setAgentPhase: (agentPhase) => set({ agentPhase }),
      setSessionId: (sessionId) => set({ sessionId }),
      setNotes: (notes) => set({ notes }),
      addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
      updateNote: (id, updates) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),
      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      clearAll: () =>
        set({ profile: null, identity: null, sessionId: null, notes: [], agentPhase: "onboarding" }),
    }),
    {
      name: "organizatum-user",
      storage: createJSONStorage(() => localStorage),
      // Nothing persisted — auth session cookies handle identity
      partialize: () => ({}),
    },
  ),
);
