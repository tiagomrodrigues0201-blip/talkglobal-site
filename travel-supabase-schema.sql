-- TalkGlobal Travel AI Planner - Supabase schema
-- Execute no SQL Editor do Supabase quando quiser salvar buscas reais.

create table if not exists public.travel_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  origin text not null,
  destination text not null,
  budget text,
  start_date date,
  end_date date,
  travel_style text,
  output_language text default 'pt-BR',
  travelers integer default 1,
  estimated_cost jsonb default '{}'::jsonb,
  result jsonb default '{}'::jsonb,
  affiliate_source text,
  affiliate_clicks integer default 0,
  plan text default 'free',
  premium_features jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.travel_searches enable row level security;

create policy "Users can read own travel searches"
  on public.travel_searches
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own travel searches"
  on public.travel_searches
  for insert
  with check (auth.uid() = user_id or user_id is null);

create index if not exists travel_searches_created_at_idx on public.travel_searches (created_at desc);
create index if not exists travel_searches_destination_idx on public.travel_searches (destination);
