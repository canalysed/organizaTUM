import { create } from "zustand";
import type { WeeklyCalendar, TimeBlock } from "@organizaTUM/shared";

interface CalendarState {
  calendar: WeeklyCalendar | null;
  selectedBlock: TimeBlock | null;
  isLoading: boolean;
  setCalendar: (calendar: WeeklyCalendar) => void;
  selectBlock: (block: TimeBlock | null) => void;
  setLoading: (loading: boolean) => void;
  addBlock: (block: TimeBlock) => void;
  updateBlock: (blockId: string, updates: Partial<TimeBlock>) => void;
  deleteBlock: (blockId: string) => void;
  clearCalendar: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  calendar: null,
  selectedBlock: null,
  isLoading: false,
  setCalendar: (calendar) => set({ calendar }),
  selectBlock: (block) => set({ selectedBlock: block }),
  setLoading: (isLoading) => set({ isLoading }),
  addBlock: (block) =>
    set((state) => {
      if (!state.calendar) return state;
      return { ...state, calendar: { ...state.calendar, blocks: [...state.calendar.blocks, block] } };
    }),
  updateBlock: (blockId, updates) =>
    set((state) => {
      if (!state.calendar) return state;
      return {
        ...state,
        calendar: {
          ...state.calendar,
          blocks: state.calendar.blocks.map((b) => b.id === blockId ? { ...b, ...updates } : b),
        },
      };
    }),
  deleteBlock: (blockId) =>
    set((state) => {
      if (!state.calendar) return state;
      return {
        ...state,
        calendar: { ...state.calendar, blocks: state.calendar.blocks.filter((b) => b.id !== blockId) },
      };
    }),
  clearCalendar: () => set({ calendar: null, selectedBlock: null, isLoading: false }),
}));
