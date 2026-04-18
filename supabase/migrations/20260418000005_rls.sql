-- ── Enable RLS on every table ─────────────────────────────────────────────────
alter table sessions         enable row level security;
alter table user_profiles    enable row level security;
alter table user_notes       enable row level security;
alter table weekly_calendars enable row level security;
alter table chat_messages    enable row level security;
alter table course_analysis  enable row level security;
alter table user_identity    enable row level security;

-- ── Policies: authenticated users can only touch their own rows ───────────────
-- Note: the service role key (used by the backend) bypasses RLS entirely,
-- so these policies only affect direct anon/user-key access.

create policy "own session"
  on sessions for all
  using (id = auth.uid()::text);

create policy "own profile"
  on user_profiles for all
  using (session_id = auth.uid()::text);

create policy "own notes"
  on user_notes for all
  using (session_id = auth.uid()::text);

create policy "own calendars"
  on weekly_calendars for all
  using (session_id = auth.uid()::text);

create policy "own messages"
  on chat_messages for all
  using (session_id = auth.uid()::text);

create policy "own course analysis"
  on course_analysis for all
  using (session_id = auth.uid()::text);

create policy "own identity"
  on user_identity for all
  using (session_id = auth.uid()::text);
