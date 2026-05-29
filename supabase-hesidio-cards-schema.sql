-- HESIDIO collectible cards
-- Apply in the Supabase SQL editor before enabling the /cartas experience.

create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  character text not null,
  rarity text not null,
  release_type text not null,
  week integer not null,
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  grant_reason text not null default 'weekly_gift',
  granted_at timestamptz not null default now(),
  unique (user_id, card_id)
);

alter table public.cards enable row level security;
alter table public.user_cards enable row level security;

drop policy if exists "Active cards are visible" on public.cards;
create policy "Active cards are visible"
on public.cards
for select
to anon, authenticated
using (active = true);

drop policy if exists "Users can read their own unlocked cards" on public.user_cards;
create policy "Users can read their own unlocked cards"
on public.user_cards
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can receive their own cards" on public.user_cards;
create policy "Users can receive their own cards"
on public.user_cards
for insert
to authenticated
with check (auth.uid() = user_id);

insert into public.cards (
  slug,
  title,
  character,
  rarity,
  release_type,
  week,
  image_path,
  active
)
values (
  'ren_natal',
  'Ren Natal',
  'Ren Hazama',
  'Especial',
  'weekly_gift',
  1,
  '/public/cards/ren_natal.png',
  true
)
on conflict (slug) do update set
  title = excluded.title,
  character = excluded.character,
  rarity = excluded.rarity,
  release_type = excluded.release_type,
  week = excluded.week,
  image_path = excluded.image_path,
  active = excluded.active;
