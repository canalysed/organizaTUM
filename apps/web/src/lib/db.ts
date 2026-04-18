import {
  UserProfileSchema,
  WeeklyCalendarSchema,
  CourseAnalysisSchema,
  UserNoteSchema,
  UserIdentitySchema,
  type UserProfile,
  type WeeklyCalendar,
  type CourseAnalysis,
  type ChatMessage,
  type UserNote,
  type NoteCategory,
  type UserIdentity,
} from "@organizaTUM/shared";
import { getSupabaseAdmin } from "./supabase-admin";

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function ensureSession(sessionId: string): Promise<void> {
  await getSupabaseAdmin()
    .from("sessions")
    .upsert({ id: sessionId, updated_at: new Date().toISOString() }, { onConflict: "id" });
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getProfile(sessionId: string): Promise<UserProfile | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_profiles")
    .select("profile")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) return null;

  const parsed = UserProfileSchema.safeParse(data.profile);
  return parsed.success ? parsed.data : null;
}

export async function saveProfile(sessionId: string, profile: UserProfile): Promise<void> {
  await getSupabaseAdmin().from("user_profiles").upsert(
    { session_id: sessionId, profile, updated_at: new Date().toISOString() },
    { onConflict: "session_id" },
  );
}

// ── Weekly Calendars ──────────────────────────────────────────────────────────

export async function getCalendar(
  sessionId: string,
  weekStart?: string,
): Promise<WeeklyCalendar | null> {
  let query = getSupabaseAdmin()
    .from("weekly_calendars")
    .select("calendar_data")
    .eq("session_id", sessionId);

  if (weekStart) {
    query = query.eq("week_start", weekStart);
  } else {
    query = query.order("week_start", { ascending: false }).limit(1);
  }

  const { data, error } = await query.single();

  if (error || !data) return null;

  const parsed = WeeklyCalendarSchema.safeParse(data.calendar_data);
  return parsed.success ? parsed.data : null;
}

export async function saveCalendar(sessionId: string, calendar: WeeklyCalendar): Promise<void> {
  const weekStart = calendar.weekStart.slice(0, 10); // YYYY-MM-DD
  await getSupabaseAdmin().from("weekly_calendars").upsert(
    {
      session_id: sessionId,
      week_start: weekStart,
      calendar_data: calendar,
    },
    { onConflict: "session_id,week_start" },
  );
}

export async function getCalendarHistory(sessionId: string): Promise<WeeklyCalendar[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("weekly_calendars")
    .select("calendar_data")
    .eq("session_id", sessionId)
    .order("week_start", { ascending: false });

  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = WeeklyCalendarSchema.safeParse(row.calendar_data);
    return parsed.success ? [parsed.data] : [];
  });
}

// ── Chat Messages ─────────────────────────────────────────────────────────────

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    role: row.role as ChatMessage["role"],
    content: row.content as string,
  }));
}

export async function saveMessages(
  sessionId: string,
  messages: ChatMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    session_id: sessionId,
    role: m.role,
    content: m.content,
  }));
  await getSupabaseAdmin().from("chat_messages").insert(rows);
}

export async function clearMessages(sessionId: string): Promise<void> {
  await getSupabaseAdmin().from("chat_messages").delete().eq("session_id", sessionId);
}

// ── Course Analysis ───────────────────────────────────────────────────────────

export async function getCourseAnalysis(
  sessionId: string,
): Promise<CourseAnalysis[] | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("course_analysis")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) return null;

  const parsed = data.flatMap((row) => {
    const result = CourseAnalysisSchema.safeParse({
      courseId: row.course_id,
      courseName: row.course_name,
      baseDifficulty: row.base_difficulty,
      adjustedDifficulty: row.adjusted_difficulty,
      adjustmentReason: row.adjustment_reason,
      weeklyStudyHours: Number(row.weekly_study_hours),
      priorityScore: row.priority_score,
    });
    return result.success ? [result.data] : [];
  });

  return parsed.length > 0 ? parsed : null;
}

export async function saveCourseAnalysis(
  sessionId: string,
  analyses: CourseAnalysis[],
): Promise<void> {
  const rows = analyses.map((a) => ({
    session_id: sessionId,
    course_id: a.courseId,
    course_name: a.courseName,
    base_difficulty: a.baseDifficulty,
    adjusted_difficulty: a.adjustedDifficulty,
    adjustment_reason: a.adjustmentReason,
    weekly_study_hours: a.weeklyStudyHours,
    priority_score: a.priorityScore,
  }));

  await getSupabaseAdmin()
    .from("course_analysis")
    .upsert(rows, { onConflict: "session_id,course_id" });
}

// ── User Notes ────────────────────────────────────────────────────────────────

export async function getNotes(sessionId: string): Promise<UserNote[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_notes")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = UserNoteSchema.safeParse({
      id: row.id,
      sessionId: row.session_id,
      category: row.category,
      content: row.content,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function createNote(
  sessionId: string,
  data: { category: NoteCategory; content: string; source: "onboarding" | "refinement" | "manual" },
): Promise<UserNote> {
  const now = new Date().toISOString();
  const { data: row, error } = await getSupabaseAdmin()
    .from("user_notes")
    .insert({
      session_id: sessionId,
      category: data.category,
      content: data.content,
      source: data.source,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !row) throw new Error(`Failed to create note: ${error?.message}`);

  return UserNoteSchema.parse({
    id: row.id,
    sessionId: row.session_id,
    category: row.category,
    content: row.content,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function updateNote(
  noteId: string,
  sessionId: string,
  updates: { content?: string; category?: NoteCategory },
): Promise<UserNote> {
  const { data: row, error } = await getSupabaseAdmin()
    .from("user_notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error || !row) throw new Error(`Failed to update note: ${error?.message}`);

  return UserNoteSchema.parse({
    id: row.id,
    sessionId: row.session_id,
    category: row.category,
    content: row.content,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function deleteNote(noteId: string, sessionId: string): Promise<void> {
  await getSupabaseAdmin()
    .from("user_notes")
    .delete()
    .eq("id", noteId)
    .eq("session_id", sessionId);
}

// ── User Identity ─────────────────────────────────────────────────────────────

export async function getIdentity(sessionId: string): Promise<UserIdentity | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_identity")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) return null;

  const parsed = UserIdentitySchema.safeParse({
    sessionId: data.session_id,
    fullName: data.full_name ?? undefined,
    tumEmail: data.tum_email ?? undefined,
    matriculationNumber: data.matriculation_number ?? undefined,
    degreeProgram: data.degree_program ?? undefined,
    faculty: data.faculty ?? undefined,
    currentSemester: data.current_semester ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

export async function saveIdentity(
  sessionId: string,
  identity: Omit<UserIdentity, "sessionId">,
): Promise<void> {
  await getSupabaseAdmin().from("user_identity").upsert(
    {
      session_id: sessionId,
      full_name: identity.fullName ?? null,
      tum_email: identity.tumEmail ?? null,
      matriculation_number: identity.matriculationNumber ?? null,
      degree_program: identity.degreeProgram ?? null,
      faculty: identity.faculty ?? null,
      current_semester: identity.currentSemester ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
}
