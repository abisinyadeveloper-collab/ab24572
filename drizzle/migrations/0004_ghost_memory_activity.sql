create table public.ghost_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fact text not null check (char_length(fact) between 1 and 500),
  created_at timestamptz not null default now()
);
create index ghost_memories_user_idx on public.ghost_memories(user_id, created_at desc);
alter table public.ghost_memories enable row level security;
grant select, insert, delete on public.ghost_memories to authenticated;
create policy "own memories read" on public.ghost_memories for select to authenticated using (auth.uid() = user_id);
create policy "own memories add" on public.ghost_memories for insert to authenticated with check (auth.uid() = user_id);
create policy "own memories delete" on public.ghost_memories for delete to authenticated using (auth.uid() = user_id);

create table public.ghost_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid,
  source text not null default 'chat',
  tier text not null,
  models text[] not null default '{}',
  tools text[] not null default '{}',
  duration_ms integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index ghost_activity_user_idx on public.ghost_activity(user_id, created_at desc);
alter table public.ghost_activity enable row level security;
grant select, insert on public.ghost_activity to authenticated;
create policy "own activity read" on public.ghost_activity for select to authenticated using (auth.uid() = user_id);
create policy "own activity add" on public.ghost_activity for insert to authenticated with check (auth.uid() = user_id);