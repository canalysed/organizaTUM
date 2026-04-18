"use client";

import { useRef } from "react";
import { useCalendarStore } from "@/stores/calendar-store";
import { parseTumCsv } from "@/lib/tum-csv-parser";
import type { WeeklyCalendar } from "@organizaTUM/shared";

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function CsvUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCalendar } = useCalendarStore();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const blocks = parseTumCsv(text);

    const now = new Date();
    const calendar: WeeklyCalendar = {
      id: crypto.randomUUID(),
      weekStart: getMondayOf(now).toISOString().split("T")[0]!,
      blocks,
      metadata: {
        generatedAt: now.toISOString(),
        studentName: "Student",
        totalStudyHours: 0,
        version: 1,
      },
    };

    setCalendar(calendar);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Import CSV
      </button>
    </>
  );
}
