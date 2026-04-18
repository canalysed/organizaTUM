create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null references sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  created_at  timestamptz default now()
);

create index chat_messages_session_idx on chat_messages(session_id, created_at asc);
