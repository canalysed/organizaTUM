create table course_analysis (
  id                  uuid primary key default gen_random_uuid(),
  session_id          text not null references sessions(id) on delete cascade,
  course_id           text not null,
  course_name         text not null,
  base_difficulty     text not null,
  adjusted_difficulty text not null,
  adjustment_reason   text not null,
  weekly_study_hours  numeric not null,
  priority_score      integer not null check (priority_score between 1 and 10),
  created_at          timestamptz default now(),
  unique (session_id, course_id)
);
