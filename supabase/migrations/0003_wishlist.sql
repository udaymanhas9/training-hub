-- Wishlist / accounting feature.
-- Two kinds of rows in one table: 'upcoming' (plain cost list) and 'wishlist'
-- (price-tracked). price_history holds the time series for tracked wishlist
-- items; push_subscriptions backs the new-all-time-low web-push alert.
-- Run once in the Supabase SQL editor.
--
-- RLS note: comparisons are written as auth.uid()::text = user_id::text so they
-- hold regardless of whether auth.uid() resolves to uuid or text in your project
-- (a plain uuid = text comparison errors with "operator does not exist").

-- Clean slate — safe to re-run; these tables hold no data until setup succeeds.
drop table if exists public.price_history cascade;
drop table if exists public.push_subscriptions cascade;
drop table if exists public.finance_items cascade;

-- ── finance_items ─────────────────────────────────────────────────────────────

create table public.finance_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  kind                text not null check (kind in ('upcoming', 'wishlist')),
  name                text not null,
  link                text not null default '',
  current_cost        numeric,
  price_selector      text,               -- optional CSS override for scraping
  track_enabled       boolean not null default true,
  lowest_price        numeric,            -- cached all-time low (wishlist)
  last_notified_price numeric,            -- dedupes the low alert
  sort_order          bigint not null default 0,  -- holds Date.now() ms values
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index finance_items_user_kind_idx
  on public.finance_items (user_id, kind, sort_order);

alter table public.finance_items enable row level security;

create policy "Users manage their own finance items"
  on public.finance_items for all
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);

-- ── price_history ─────────────────────────────────────────────────────────────

create table public.price_history (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.finance_items(id) on delete cascade,
  price      numeric not null,
  checked_at timestamptz not null default now()
);

create index price_history_item_time_idx
  on public.price_history (item_id, checked_at);

alter table public.price_history enable row level security;

-- A history row is visible/writable only if its parent item belongs to the user.
create policy "Users read their own price history"
  on public.price_history for select
  using (
    exists (
      select 1 from public.finance_items i
      where i.id = price_history.item_id and i.user_id::text = auth.uid()::text
    )
  );

create policy "Users write their own price history"
  on public.price_history for insert
  with check (
    exists (
      select 1 from public.finance_items i
      where i.id = price_history.item_id and i.user_id::text = auth.uid()::text
    )
  );

-- ── push_subscriptions ────────────────────────────────────────────────────────
-- Backs web-push alerts. Server (service role) reads these to send; the client
-- upserts its own subscription. endpoint is globally unique per browser.

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,             -- { p256dh, auth }
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid()::text = user_id::text)
  with check (auth.uid()::text = user_id::text);
