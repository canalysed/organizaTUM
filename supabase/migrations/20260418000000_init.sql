create table sessions (
  id         text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_profiles (
  session_id  text primary key references sessions(id) on delete cascade,
  profile     jsonb not null,
  calendar    jsonb,
  updated_at  timestamptz default now()
);

create table user_notes (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null references sessions(id) on delete cascade,
  category    text not null check (category in ('preference','constraint','strength','weakness','goal')),
  content     text not null check (char_length(content) between 1 and 500),
  source      text not null check (source in ('onboarding','refinement','manual')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index user_notes_session_idx on user_notes(session_id);
