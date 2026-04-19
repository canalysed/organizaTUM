import { z } from "zod";
import { CourseSchema, type Course, type DayOfWeek, type Difficulty } from "@organizaTUM/shared";

// ── Raw DOM types (internal only) ─────────────────────────────────────────────

const RawSlotSchema = z.object({
  dayRaw: z.string(),
  startRaw: z.string(),
  endRaw: z.string(),
  room: z.string().optional(),
  spots: z.number().optional(),
});

export const RawScrapedCourseSchema = z.object({
  tumonlineId: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  credits: z.number().optional(),
  lectureSlots: z.array(RawSlotSchema),
  uebungsSlots: z.array(RawSlotSchema),
});
export type RawScrapedCourse = z.infer<typeof RawScrapedCourseSchema>;

// ── Day name mapping (reuses same abbreviations as tum-csv-parser.ts) ─────────

const DAY_MAP: Record<string, DayOfWeek> = {
  Mo: "monday",
  Di: "tuesday",
  Mi: "wednesday",
  Do: "thursday",
  Fr: "friday",
  Sa: "saturday",
  So: "sunday",
  // full German names as fallback
  Montag: "monday",
  Dienstag: "tuesday",
  Mittwoch: "wednesday",
  Donnerstag: "thursday",
  Freitag: "friday",
  Samstag: "saturday",
  Sonntag: "sunday",
  // English (just in case)
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday",
};

function mapDay(raw: string): DayOfWeek | null {
  return DAY_MAP[raw.trim()] ?? null;
}

// Normalize time strings like "10:00 Uhr" or "10:00:00" → "10:00"
function normalizeTime(raw: string): string {
  return raw.trim().replace(/\s*Uhr$/i, "").slice(0, 5);
}

function inferDifficulty(credits: number): Difficulty {
  if (credits >= 10) return "very-hard";
  if (credits >= 8) return "hard";
  if (credits >= 6) return "medium";
  return "easy";
}

export function transformScrapedCourse(raw: RawScrapedCourse): Course | null {
  const credits = raw.credits ?? 6;
  const shortName = raw.shortName ?? raw.name.split(" ")[0];

  const lectureBlocks = raw.lectureSlots.flatMap((slot, i) => {
    const dayOfWeek = mapDay(slot.dayRaw);
    if (!dayOfWeek) return [];
    return [
      {
        id: `${raw.tumonlineId}-lec-${i}`,
        type: "lecture" as const,
        title: raw.name,
        dayOfWeek,
        startTime: normalizeTime(slot.startRaw),
        endTime: normalizeTime(slot.endRaw),
        location: slot.room,
        courseId: raw.tumonlineId,
        isFixed: true,
      },
    ];
  });

  const uebungsklassen = raw.uebungsSlots.flatMap((slot, i) => {
    const dayOfWeek = mapDay(slot.dayRaw);
    if (!dayOfWeek) return [];
    return [
      {
        id: `${raw.tumonlineId}-ue-${i}`,
        dayOfWeek,
        startTime: normalizeTime(slot.startRaw),
        endTime: normalizeTime(slot.endRaw),
        room: slot.room,
        spotsAvailable: slot.spots,
      },
    ];
  });

  const course = {
    id: raw.tumonlineId,
    name: raw.name,
    shortName,
    credits,
    difficulty: inferDifficulty(credits),
    lectureBlocks,
    uebungsklassen,
    weeklyStudyHoursRecommended: Math.round(credits * 0.75),
    tags: [],
  };

  const parsed = CourseSchema.safeParse(course);
  return parsed.success ? parsed.data : null;
}

export function transformAll(rawCourses: RawScrapedCourse[]): Course[] {
  return rawCourses.flatMap((raw) => {
    const course = transformScrapedCourse(raw);
    return course ? [course] : [];
  });
}
