import { create } from "zustand";
import type { WeeklyCalendar, TimeBlock } from "@organizaTUM/shared";

interface CalendarState {
  calendar: WeeklyCalendar | null;
  selectedBlock: TimeBlock | null;
  isLoading: boolean;
  setCalendar: (calendar: WeeklyCalendar) => void;
  selectBlock: (block: TimeBlock | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  calendar: null,
  selectedBlock: null,
  isLoading: false,
  setCalendar: (calendar) => set({ calendar }),
  selectBlock: (block) => set({ selectedBlock: block }),
  setLoading: (isLoading) => set({ isLoading }),
}));
