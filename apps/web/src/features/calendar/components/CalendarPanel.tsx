"use client";

import { useCalendarStore } from "@/stores/calendar-store";
import { CalendarView } from "./CalendarView";
import { BlockEditor } from "./BlockEditor";
import { ExportButton } from "./ExportButton";

export function CalendarPanel() {
  const { calendar, selectedBlock, isLoading } = useCalendarStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Weekly Schedule</span>
        {calendar && <ExportButton />}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-tum-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Building your schedule...</p>
            </div>
          </div>
        )}

        {calendar ? (
          <CalendarView calendar={calendar} />
        ) : (
          <div className="h-full flex items-center justify-center text-center px-8">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                Your personalized schedule will appear here once the onboarding is complete.
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedBlock && <BlockEditor block={selectedBlock} />}
    </div>
  );
}
