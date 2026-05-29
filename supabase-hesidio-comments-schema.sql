-- HESIDIO episode comments
-- Apply in the Supabase SQL editor before enabling comments on episode pages.

create extension if not exists pgcrypto;

create table if not exists public.episode_comments (
  id uuid primary key default gen_random_uuid(),
  episode_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  content text not null,
  created_at timestamptz not null default now(),
  is_hidden boolean not null default false,
  constraint episode_comments_content_not_blank check (char_length(btrim(content)) > 0),
  constraint episode_comments_content_length check (char_length(content) <= 500)
);

create index if not exists episode_comments_episode_created_idx
on public.episode_comments (episode_slug, created_at desc)
where is_hidden = false;

create index if not exists episode_comments_user_idx
on public.episode_comments (user_id);

alter table public.episode_comments enable row level security;

drop policy if exists "Visible episode comments are readable" on public.episode_comments;
create policy "Visible episode comments are readable"
on public.episode_comments
for select
to anon, authenticated
using (is_hidden = false);

drop policy if exists "Users can create their own episode comments" on public.episode_comments;
create policy "Users can create their own episode comments"
on public.episode_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and coalesce(user_email, '') = coalesce(auth.jwt() ->> 'email', '')
);

drop policy if exists "Users can delete their own episode comments" on public.episode_comments;
create policy "Users can delete their own episode comments"
on public.episode_comments
for delete
to authenticated
using (auth.uid() = user_id);
