-- Estrutura do Translated with TalkGlobal AI.
-- Usada pelo backend para acompanhar jobs reais de tradução de vídeo.

create table if not exists public.video_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  original_file_path text not null,
  original_video_path text,
  original_file_name text,
  original_language text default 'auto',
  target_language text not null,
  caption_style text not null default 'Clean',
  status text not null default 'created' check (status in ('created','uploaded','transcribing','translating','generating_srt','rendering','completed','failed')),
  final_video_path text,
  rendered_video_path text,
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

-- Migração segura para separar video original, SRT e MP4 renderizado.
alter table public.video_translation_jobs add column if not exists original_video_path text;
alter table public.video_translation_jobs add column if not exists rendered_video_path text;

-- Diagnóstico de renderização FFmpeg/ASS. Execute também esta migração
-- para habilitar o endpoint /api/translate-video?action=debug&jobId=...
alter table public.video_translation_jobs add column if not exists ass_path text;
alter table public.video_translation_jobs add column if not exists ffmpeg_command text;
alter table public.video_translation_jobs add column if not exists ffmpeg_exit_code integer;
alter table public.video_translation_jobs add column if not exists ffmpeg_stderr_tail text;
alter table public.video_translation_jobs add column if not exists ffmpeg_subtitle_log_detected boolean;
alter table public.video_translation_jobs add column if not exists ffmpeg_subtitle_failure_detected boolean;
alter table public.video_translation_jobs add column if not exists rendered_file_size bigint;
alter table public.video_translation_jobs add column if not exists original_file_size bigint;
alter table public.video_translation_jobs add column if not exists rendered_different_from_original boolean;
alter table public.video_translation_jobs add column if not exists debug_payload jsonb;
alter table public.video_translation_jobs add column if not exists render_attempts integer not null default 0;
update public.video_translation_jobs
set original_video_path = coalesce(original_video_path, original_file_path)
where original_video_path is null;
update public.video_translation_jobs
set rendered_video_path = coalesce(rendered_video_path, final_video_path)
where rendered_video_path is null and final_video_path is not null;

-- Migração segura para quem já criou a tabela antes do status created.
alter table public.video_translation_jobs alter column status set default 'created';
alter table public.video_translation_jobs drop constraint if exists video_translation_jobs_status_check;
alter table public.video_translation_jobs add constraint video_translation_jobs_status_check
  check (status in ('created','uploaded','transcribing','translating','generating_srt','rendering','completed','failed'));

alter table public.video_translation_jobs enable row level security;

drop policy if exists "Users can view own video jobs" on public.video_translation_jobs;
drop policy if exists "Users can create own video jobs" on public.video_translation_jobs;

create policy "Users can view own video jobs"
on public.video_translation_jobs for select
using (auth.uid() = user_id);

create policy "Users can create own video jobs"
on public.video_translation_jobs for insert
with check (auth.uid() = user_id);


-- Bucket recomendado para os arquivos do tradutor.
-- Execute uma vez no SQL Editor ou crie pelo painel Storage do Supabase.
-- Fase 1 usa createSignedUploadUrl + uploadToSignedUrl para upload direto do navegador ao Storage.
-- Fase 2 deve usar TUS/resumable upload e worker externo para arquivos maiores.
insert into storage.buckets (id, name, public)
values ('video-translations', 'video-translations', false)
on conflict (id) do nothing;
