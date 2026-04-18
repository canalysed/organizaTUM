import { z } from "zod";

// ── Primitives ────────────────────────────────────────────────────────────────

export const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM");

export const DayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const BlockTypeSchema = z.enum([
  "lecture",
  "uebung",
  "study",
  "meal",
  "break",
  "leisure",
  "exercise",
  "commitment",
]);
export type BlockType = z.infer<typeof BlockTypeSchema>;

// ── TimeBlock ─────────────────────────────────────────────────────────────────

export const TimeBlockSchema = z.object({
  id: z.string(),
  type: BlockTypeSchema,
  title: z.string(),
  dayOfWeek: DayOfWeekSchema,
  startTime: TimeSchema,
  endTime: TimeSchema,
  courseId: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  color: z.string().optional(),
  isFixed: z.boolean().default(false),
});
export type TimeBlock = z.infer<typeof TimeBlockSchema>;

// ── Course ────────────────────────────────────────────────────────────────────

export const DifficultySchema = z.enum(["easy", "medium", "hard", "very-hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const UebungsklasseSchema = z.object({
  id: z.string(),
  dayOfWeek: DayOfWeekSchema,
  startTime: TimeSchema,
  endTime: TimeSchema,
  room: z.string().optional(),
  spotsAvailable: z.number().optional(),
});
export type Uebungsklasse = z.infer<typeof UebungsklasseSchema>;

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  credits: z.number(),
  difficulty: DifficultySchema,
  lectureBlocks: z.array(TimeBlockSchema),
  uebungsklassen: z.array(UebungsklasseSchema),
  weeklyStudyHoursRecommended: z.number(),
  tags: z.array(z.string()).default([]),
});
export type Course = z.infer<typeof CourseSchema>;

export const CourseSelectionSchema = z.object({
  courseId: z.string(),
  courseName: z.string(),
  selectedUebungsklasseId: z.string().optional(),
  adjustedDifficulty: DifficultySchema.optional(),
});
export type CourseSelection = z.infer<typeof CourseSelectionSchema>;

// ── Mensa Preferences ─────────────────────────────────────────────────────────

export const MensaPreferencesSchema = z.object({
  eatAtMensa: z.boolean().default(true),
  dietaryRestrictions: z.array(z.string()).default([]),
  preferredMensaTimes: z
    .object({
      lunch: TimeSchema.optional(),
      dinner: TimeSchema.optional(),
    })
    .default({}),
});
export type MensaPreferences = z.infer<typeof MensaPreferencesSchema>;

// ── User Profile ──────────────────────────────────────────────────────────────

export const LearningStyleSchema = z.enum([
  "spaced-repetition",
  "deep-session",
  "unknown",
]);
export type LearningStyle = z.infer<typeof LearningStyleSchema>;

export const UserProfileSchema = z.object({
  name: z.string(),
  courses: z.array(CourseSelectionSchema),
  learningStyle: LearningStyleSchema,
  fixedCommitments: z.array(TimeBlockSchema),
  mensaPreferences: MensaPreferencesSchema,
  leisureInterests: z.array(z.string()),
  studyStrengths: z.array(z.string()),
  studyWeaknesses: z.array(z.string()),
  // Scheduling detail fields — all optional with defaults for backwards compatibility
  wakeUpTime: TimeSchema.default("08:00"),
  sleepTime: TimeSchema.default("23:00"),
  preferredStudyTime: z.enum(["morning", "afternoon", "evening"]).default("afternoon"),
  maxDailyStudyHours: z.number().min(1).max(12).default(6),
  weekendPreference: z.enum(["free", "light", "full"]).default("light"),
  campusLocation: z.enum(["garching", "city", "weihenstephan"]).default("garching"),
  preferredMensa: z.string().optional(),
});

// ── User Identity ─────────────────────────────────────────────────────────────

export const UserIdentitySchema = z.object({
  sessionId: z.string(),
  fullName: z.string().optional(),
  tumEmail: z.string().email().optional(),
  matriculationNumber: z.string().optional(),
  degreeProgram: z.string().optional(),
  faculty: z.string().optional(),
  currentSemester: z.number().int().min(1).max(20).optional(),
});
export type UserIdentity = z.infer<typeof UserIdentitySchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ── Weekly Calendar ───────────────────────────────────────────────────────────

export const CalendarMetadataSchema = z.object({
  generatedAt: z.string(),
  studentName: z.string(),
  totalStudyHours: z.number(),
  version: z.number().default(1),
});
export type CalendarMetadata = z.infer<typeof CalendarMetadataSchema>;

export const WeeklyCalendarSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  blocks: z.array(TimeBlockSchema),
  metadata: CalendarMetadataSchema,
});
export type WeeklyCalendar = z.infer<typeof WeeklyCalendarSchema>;

// ── Onboarding ────────────────────────────────────────────────────────────────

export const OnboardingPhaseSchema = z.enum([
  "greeting",
  "courses",
  "learning-style",
  "commitments",
  "mensa",
  "leisure",
  "complete",
]);
export type OnboardingPhase = z.infer<typeof OnboardingPhaseSchema>;

export const OnboardingResponseSchema = z.object({
  phase: OnboardingPhaseSchema,
  message: z.string(),
  profileSoFar: UserProfileSchema.partial(),
  isComplete: z.boolean().default(false),
  nextQuestion: z.string().optional(),
});
export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;

// ── Analysis ──────────────────────────────────────────────────────────────────

export const CourseAnalysisSchema = z.object({
  courseId: z.string(),
  courseName: z.string(),
  baseDifficulty: DifficultySchema,
  adjustedDifficulty: DifficultySchema,
  adjustmentReason: z.string(),
  weeklyStudyHours: z.number(),
  priorityScore: z.number().min(1).max(10),
});
export type CourseAnalysis = z.infer<typeof CourseAnalysisSchema>;

// ── Refinement ────────────────────────────────────────────────────────────────

export const RefinementTypeSchema = z.enum(["global", "targeted"]);

export const RefinementRequestSchema = z.object({
  type: RefinementTypeSchema,
  message: z.string(),
  targetBlockId: z.string().optional(),
  targetBlockTitle: z.string().optional(),
});
export type RefinementRequest = z.infer<typeof RefinementRequestSchema>;

// ── Agent Phases ──────────────────────────────────────────────────────────────

export const AgentPhaseSchema = z.enum([
  "onboarding",
  "analysis",
  "scheduling",
  "refinement",
  "leisure",
  "done",
]);
export type AgentPhase = z.infer<typeof AgentPhaseSchema>;

// ── User Notes (AI-extracted facts) ───────────────────────────────────────────

export const NoteCategorySchema = z.enum([
  "preference",
  "constraint",
  "strength",
  "weakness",
  "goal",
]);
export type NoteCategory = z.infer<typeof NoteCategorySchema>;

export const UserNoteSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  category: NoteCategorySchema,
  content: z.string().min(1).max(500),
  source: z.enum(["onboarding", "refinement", "manual"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserNote = z.infer<typeof UserNoteSchema>;

export const NoteExtractionSchema = z.object({
  notes: z.array(
    z.object({
      category: NoteCategorySchema,
      content: z.string().min(1).max(500),
      shouldSave: z.boolean(),
    }),
  ),
  hasNewInformation: z.boolean(),
});
export type NoteExtraction = z.infer<typeof NoteExtractionSchema>;

export const CreateNoteSchema = z.object({
  category: NoteCategorySchema,
  content: z.string().min(1).max(500),
  source: z.literal("manual"),
});
export type CreateNote = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  category: NoteCategorySchema.optional(),
});
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;

// ── API Types ─────────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  userProfile: UserProfileSchema.optional(),
  sessionId: z.string().optional(),
  userNotes: z.array(UserNoteSchema).optional().default([]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const CalendarUpdateSchema = z.object({
  blockId: z.string(),
  updates: TimeBlockSchema.partial(),
});
export type CalendarUpdate = z.infer<typeof CalendarUpdateSchema>;
