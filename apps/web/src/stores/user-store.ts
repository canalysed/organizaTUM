"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile, AgentPhase, UserNote, UserIdentity, Course } from "@organizaTUM/shared";

interface UserState {
  profile: UserProfile | null;
  identity: UserIdentity | null;
  agentPhase: AgentPhase;
  sessionId: string | null;
  notes: UserNote[];
  tumCourses: Course[] | null;
  selectedCanteenId: string | null;
  darkMode: boolean;
  setProfile: (profile: UserProfile) => void;
  setIdentity: (identity: UserIdentity) => void;
  setAgentPhase: (phase: AgentPhase) => void;
  setSessionId: (id: string) => void;
  setNotes: (notes: UserNote[]) => void;
  addNote: (note: UserNote) => void;
  updateNote: (id: string, updates: Partial<UserNote>) => void;
  removeNote: (id: string) => void;
  setTumCourses: (courses: Course[] | null) => void;
  setSelectedCanteenId: (id: string | null) => void;
  toggleDarkMode: () => void;
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
      tumCourses: null,
      selectedCanteenId: null,
      darkMode: false,
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
      setTumCourses: (tumCourses) => set({ tumCourses }),
      setSelectedCanteenId: (selectedCanteenId) => set({ selectedCanteenId }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      clearAll: () =>
        set({ profile: null, identity: null, sessionId: null, notes: [], tumCourses: null, agentPhase: "onboarding" }),
    }),
    {
      name: "organizatum-user",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ darkMode: s.darkMode, selectedCanteenId: s.selectedCanteenId }),
    },
  ),
);
