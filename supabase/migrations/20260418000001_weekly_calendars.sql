alter table user_profiles drop column if exists calendar;

create table weekly_calendars (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null references sessions(id) on delete cascade,
  week_start    date not null,
  calendar_data jsonb not null,
  created_at    timestamptz default now()
);

create unique index weekly_calendars_session_week_idx on weekly_calendars(session_id, week_start);
create index weekly_calendars_session_idx on weekly_calendars(session_id, week_start desc);
