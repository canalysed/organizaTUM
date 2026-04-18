create table user_identity (
  session_id           text primary key references sessions(id) on delete cascade,
  full_name            text,
  tum_email            text,
  matriculation_number text,
  degree_program       text,
  faculty              text,
  current_semester     integer check (current_semester between 1 and 20),
  updated_at           timestamptz default now()
);
