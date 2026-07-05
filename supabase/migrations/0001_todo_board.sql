-- Kanban board storage: one JSON document per user.
-- Run once in the Supabase SQL editor.

create table if not exists public.todo_board (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_board enable row level security;

create policy "Users manage their own board"
  on public.todo_board for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
