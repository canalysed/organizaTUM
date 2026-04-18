-- Drop and recreate user_identity with correct schema
-- Production had stale columns (matriculation_number, degree_program) from old manual setup
drop table if exists user_identity cascade;

create table user_identity (
  session_id           text primary key references sessions(id) on delete cascade,
  full_name            text,
  tum_email            text,
  faculty              text,
  current_semester     integer check (current_semester between 1 and 20),
  updated_at           timestamptz default now()
);

alter table user_identity enable row level security;

create policy "own identity"
  on user_identity for all
  using (session_id = auth.uid()::text);
