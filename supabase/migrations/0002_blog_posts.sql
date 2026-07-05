-- Blog posts, one row per post, per user.
-- Run once in the Supabase SQL editor.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  subtitle text,
  cover_image text,
  body text not null default '',
  author text,
  date date not null default current_date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

create policy "Users manage their own posts"
  on public.blog_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists blog_posts_user_date_idx
  on public.blog_posts (user_id, date desc);
