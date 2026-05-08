-- Estrutura proposta para o MVP Translated with TalkGlobal AI.
-- Ajuste os nomes de auth/users conforme a estrutura real do projeto.

create table if not exists public.video_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  original_file_path text not null,
  original_file_name text,
  original_language text default 'auto',
  target_language text not null,
  caption_style text not null default 'Clean',
  status text not null default 'uploaded' check (status in ('uploaded','transcribing','translating','rendering','completed','failed')),
  final_video_path text,
  srt_path text,
  duration_seconds integer,
  file_size_bytes bigint,
  plan text not null default 'free' check (plan in ('free','premium')),
  has_watermark boolean not null default true,
  is_hd boolean not null default false,
  priority text not null default 'normal' check (priority in ('normal','high')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_translation_jobs enable row level security;

create policy "Users can view own video jobs"
on public.video_translation_jobs for select
using (auth.uid() = user_id);

create policy "Users can create own video jobs"
on public.video_translation_jobs for insert
with check (auth.uid() = user_id);
