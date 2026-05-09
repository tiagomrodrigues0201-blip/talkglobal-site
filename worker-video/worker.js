import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import WebSocket from 'ws';

const execFileAsync = promisify(execFile);
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);
const MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS || 3);
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'video-translations';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';
const LANGUAGE_LABELS = {
  auto: 'automaticamente',
  pt: 'português do Brasil',
  en: 'inglês',
  es: 'espanhol',
  fr: 'francês',
  it: 'italiano',
  de: 'alemão',
  ja: 'japonês',
  ko: 'coreano'
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket }
});
const openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeName(name = 'video.mp4') {
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'video.mp4';
}

async function updateJob(jobId, patch) {
  const { error } = await supabase
    .from('video_translation_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw new Error(`Erro ao atualizar job ${jobId}: ${error.message}`);
}

async function updateDiagnostics(jobId, diagnostics) {
  const payload = {
    ass_path: diagnostics.assPath || null,
    ffmpeg_command: diagnostics.ffmpegCommand || null,
    ffmpeg_exit_code: diagnostics.ffmpegExitCode ?? null,
    ffmpeg_stderr_tail: diagnostics.ffmpegStderrTail || '',
    ffmpeg_subtitle_log_detected: Boolean(diagnostics.ffmpegSubtitleLogDetected),
    ffmpeg_subtitle_failure_detected: Boolean(diagnostics.ffmpegSubtitleFailureDetected),
    rendered_file_size: diagnostics.renderedFileSize || 0,
    original_file_size: diagnostics.originalFileSize || 0,
    rendered_different_from_original: Boolean(diagnostics.renderedDifferentFromOriginal),
    debug_payload: diagnostics,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('video_translation_jobs').update(payload).eq('id', jobId);
  if (error) console.warn('diagnostics-update-skipped', { jobId, error: error.message });
}

async function claimNextJob() {
  const { data, error } = await supabase
    .from('video_translation_jobs')
    .select('*')
    .eq('status', 'uploaded')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw new Error(`Erro ao buscar jobs: ${error.message}`);
  const job = data?.[0];
  if (!job) return null;

  const attempts = Number(job.render_attempts || 0);
  if (attempts >= MAX_ATTEMPTS) {
    await updateJob(job.id, { status: 'failed', error_message: `Limite de tentativas atingido (${MAX_ATTEMPTS}).` });
    return null;
  }

  const { data: claimed, error: claimError } = await supabase
    .from('video_translation_jobs')
    .update({ status: 'transcribing', render_attempts: attempts + 1, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'uploaded')
    .select('*')
    .single();

  if (claimError || !claimed) return null;
  return claimed;
}

async function downloadStorageFile(filePath, outputPath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
  if (error || !data) throw new Error(`Erro ao baixar ${filePath}: ${error?.message || 'arquivo indisponível'}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

async function uploadStorageFile(filePath, file, contentType) {
  const buffer = fs.readFileSync(file);
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Erro ao salvar ${filePath}: ${error.message}`);
  return buffer.length;
}

async function uploadStorageText(filePath, text, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, Buffer.from(text, 'utf8'), { contentType, upsert: true });
  if (error) throw new Error(`Erro ao salvar ${filePath}: ${error.message}`);
}

async function getVideoInfo(inputPath) {
  try {
    const { stdout } = await execFileAsync(FFPROBE_PATH, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json',
      inputPath
    ], { timeout: 30000 });
    const parsed = JSON.parse(stdout || '{}');
    const stream = Array.isArray(parsed.streams) ? parsed.streams[0] : {};
    return {
      duration: Number.parseFloat(parsed.format?.duration) || 0,
      width: Number(stream.width) || 1080,
      height: Number(stream.height) || 1920
    };
  } catch (error) {
    console.warn('ffprobe-fallback', { message: error.message });
    return { duration: 0, width: 1080, height: 1920 };
  }
}

async function extractAudio(inputPath, audioPath) {
  await execFileAsync(FFMPEG_PATH, ['-y', '-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', audioPath], { timeout: 300000 });
}

async function transcribeAudio(audioPath) {
  const result = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment']
  });
  const segments = Array.isArray(result.segments) && result.segments.length
    ? result.segments.map((segment, index) => ({ index, start: segment.start || 0, end: segment.end || Math.max((segment.start || 0) + 3, 3), text: segment.text || '' }))
    : [{ index: 0, start: 0, end: 5, text: result.text || '' }];
  return segments.filter((segment) => String(segment.text || '').trim());
}

async function translateSegments(segments, targetLanguage, sourceLanguage) {
  const target = LANGUAGE_LABELS[targetLanguage] || targetLanguage;
  const source = LANGUAGE_LABELS[sourceLanguage] || sourceLanguage || 'automaticamente';
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Você traduz legendas de vídeo com naturalidade. Preserve intenção, emoção, contexto, gírias e sentido real. Não traduza palavra por palavra. Responda apenas JSON válido.' },
      { role: 'user', content: JSON.stringify({ instruction: `Traduza de ${source} para ${target}. Retorne exatamente o mesmo número de segmentos.`, schema: { segments: [{ index: 0, text: 'texto traduzido' }] }, segments: segments.map(({ index, text }) => ({ index, text })) }) }
    ]
  });
  const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
  const translated = Array.isArray(parsed.segments) ? parsed.segments : [];
  return segments.map((segment, index) => {
    const match = translated.find((item) => Number(item.index) === segment.index) || translated[index];
    return { ...segment, text: String(match?.text || segment.text).trim() };
  });
}

function toSrtTime(value) {
  const ms = Math.max(0, Math.round((value % 1) * 1000)).toString().padStart(3, '0');
  const total = Math.max(0, Math.floor(value));
  const h = Math.floor(total / 3600).toString().padStart(2, '0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const sec = Math.floor(total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec},${ms}`;
}

function toAssTime(value) {
  const cs = Math.max(0, Math.round((value % 1) * 100)).toString().padStart(2, '0');
  const total = Math.max(0, Math.floor(value));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const sec = Math.floor(total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}.${cs}`;
}

function makeSrt(segments) {
  return segments.map((segment, index) => `${index + 1}\n${toSrtTime(segment.start)} --> ${toSrtTime(segment.end)}\n${String(segment.text).replace(/\n+/g, ' ')}\n`).join('\n');
}

function wrapAssText(text, maxChars = 34) {
  const words = String(text || '').replace(/\r?\n+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3).join('\\N');
}

function escapeAssText(text) {
  return wrapAssText(text).replace(/\\(?!N)/g, '\\\\').replace(/[{}]/g, '').trim();
}

function makeAss(segments, styleName, watermark, durationSeconds, video) {
  const width = Math.max(360, Number(video.width) || 1080);
  const height = Math.max(360, Number(video.height) || 1920);
  const shortSide = Math.min(width, height);
  const fontSize = Math.max(30, Math.round(shortSide * (styleName === 'TikTok Bold' ? 0.062 : 0.052)));
  const maxEnd = Math.max(Number(durationSeconds) || 0, ...segments.map((segment) => Number(segment.end) || 0), 3);
  const events = segments.map((segment) => `Dialogue: 0,${toAssTime(segment.start || 0)},${toAssTime(segment.end || Math.max((segment.start || 0) + 3, 3))},Caption,,0000,0000,0000,,${escapeAssText(segment.text)}`);
  if (watermark) events.unshift(`Dialogue: 1,0:00:00.00,${toAssTime(maxEnd)},Watermark,,0000,0000,0000,,Translated with TalkGlobal AI`);
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    'ScaledBorderAndShadow: yes',
    'WrapStyle: 0',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Caption,DejaVu Sans,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&HA0000000,1,0,0,0,100,100,0,0,3,4,0,2,48,48,${Math.max(36, Math.round(height * 0.075))},1`,
    `Style: Watermark,DejaVu Sans,${Math.max(18, Math.round(shortSide * 0.03))},&H00FFFFFF,&H000000FF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,3,2,0,8,40,40,${Math.max(22, Math.round(height * 0.04))},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    ''
  ].join('\n');
}

function escapeFilterPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function ffmpegCommandForLog(args) {
  return [FFMPEG_PATH, ...args].map((part) => /\s/.test(String(part)) ? JSON.stringify(String(part)) : String(part)).join(' ');
}

async function renderVideo(inputPath, assPath, outputPath) {
  const filter = `subtitles='${escapeFilterPath(assPath)}'`;
  const args = [
    '-y', '-loglevel', 'verbose',
    '-i', inputPath,
    '-vf', filter,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath
  ];
  const command = ffmpegCommandForLog(args);
  console.info('ffmpeg-command', command);
  try {
    const result = await execFileAsync(FFMPEG_PATH, args, { timeout: 600000 });
    return { command, exitCode: 0, stderr: result.stderr || '', filter };
  } catch (error) {
    error.ffmpegCommand = command;
    error.ffmpegExitCode = typeof error.code === 'number' ? error.code : 1;
    error.ffmpegStderr = error.stderr || error.message || '';
    throw error;
  }
}

async function processJob(job) {
  const jobId = job.id;
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), `talkglobal-worker-${jobId}-`));
  const originalPath = job.original_video_path || job.original_file_path;
  const inputPath = path.join(workdir, safeName(job.original_file_name || 'input.mp4'));
  const audioPath = path.join(workdir, 'audio.mp3');
  const srtPath = path.join(workdir, 'translated.srt');
  const assPath = path.join(workdir, 'translated.ass');
  const outputPath = path.join(workdir, 'translated.mp4');
  const srtStoragePath = `${jobId}/translated.srt`;
  const assStoragePath = `${jobId}/translated.ass`;
  const renderedStoragePath = `${jobId}/translated.mp4`;

  try {
    console.info('processing-job', { jobId, originalPath });
    const originalFileSize = await downloadStorageFile(originalPath, inputPath);
    const videoInfo = await getVideoInfo(inputPath);
    const maxSeconds = Number(process.env.MAX_FREE_VIDEO_SECONDS || 90);
    if (job.plan !== 'premium' && videoInfo.duration && videoInfo.duration > maxSeconds) {
      throw new Error(`No plano grátis, use vídeos de até ${maxSeconds} segundos.`);
    }

    await extractAudio(inputPath, audioPath);
    const originalSegments = await transcribeAudio(audioPath);
    if (!originalSegments.length) throw new Error('Não foi possível detectar falas no vídeo.');

    await updateJob(jobId, { status: 'translating' });
    const translatedSegments = await translateSegments(originalSegments, job.target_language || 'pt', job.original_language || 'auto');

    await updateJob(jobId, { status: 'generating_srt' });
    const srt = makeSrt(translatedSegments);
    const ass = makeAss(translatedSegments, job.caption_style || 'Clean', job.plan !== 'premium', videoInfo.duration, videoInfo);
    fs.writeFileSync(srtPath, srt, 'utf8');
    fs.writeFileSync(assPath, ass, 'utf8');
    await uploadStorageText(srtStoragePath, srt, 'application/x-subrip; charset=utf-8');
    await uploadStorageText(assStoragePath, ass, 'text/plain; charset=utf-8');

    await updateJob(jobId, { status: 'rendering', srt_path: srtStoragePath, ass_path: assStoragePath });
    const renderResult = await renderVideo(inputPath, assPath, outputPath);
    const renderedFileExists = fs.existsSync(outputPath);
    const renderedFileSize = renderedFileExists ? fs.statSync(outputPath).size : 0;
    const renderedDifferentFromOriginal = renderedFileExists && renderedFileSize > 0 && !fs.readFileSync(outputPath).equals(fs.readFileSync(inputPath));
    const stderr = String(renderResult.stderr || '');
    const ffmpegSubtitleLogDetected = /Parsed_subtitles_\d+|libass|Using font provider|fontselect/i.test(stderr);
    const ffmpegSubtitleFailureDetected = /No such filter|Unable to open|Error initializing filter|Error while processing|Invalid argument/i.test(stderr);
    const diagnostics = {
      jobId,
      originalVideoPath: originalPath,
      srtPath: srtStoragePath,
      assPath: assStoragePath,
      outputVideoPath: outputPath,
      renderedVideoPath: renderedStoragePath,
      renderedFileExists,
      renderedFileSize,
      originalFileSize,
      renderedDifferentFromOriginal,
      ffmpegCommand: renderResult.command,
      ffmpegExitCode: renderResult.exitCode,
      ffmpegSubtitleLogDetected,
      ffmpegSubtitleFailureDetected,
      ffmpegStderrTail: stderr.slice(-3000),
      assPreview: ass.slice(0, 1200),
      srtPreview: srt.slice(0, 1200)
    };
    await updateDiagnostics(jobId, diagnostics);

    const failures = [];
    if (renderResult.exitCode !== 0) failures.push('FFmpeg exitCode diferente de 0');
    if (!renderedFileExists) failures.push('MP4 renderizado não foi criado');
    if (renderedFileSize <= 0) failures.push('MP4 renderizado está vazio');
    if (!renderedDifferentFromOriginal) failures.push('MP4 renderizado não difere do original');
    if (!ffmpegSubtitleLogDetected) failures.push('FFmpeg não confirmou libass/subtitles');
    if (ffmpegSubtitleFailureDetected) failures.push('FFmpeg registrou falha no filtro de legenda');
    if (failures.length) throw new Error(`Renderização inválida: ${failures.join('; ')}.`);

    await uploadStorageFile(renderedStoragePath, outputPath, 'video/mp4');
    await updateJob(jobId, {
      status: 'completed',
      rendered_video_path: renderedStoragePath,
      final_video_path: renderedStoragePath,
      srt_path: srtStoragePath,
      ass_path: assStoragePath,
      error_message: null
    });
    console.info('job-completed', { jobId, renderedStoragePath });
  } catch (error) {
    console.error('job-failed', { jobId, message: error.message });
    await updateDiagnostics(jobId, {
      jobId,
      assPath: assStoragePath,
      srtPath: srtStoragePath,
      renderedVideoPath: renderedStoragePath,
      ffmpegCommand: error.ffmpegCommand || null,
      ffmpegExitCode: error.ffmpegExitCode ?? 1,
      ffmpegStderrTail: String(error.ffmpegStderr || error.message || '').slice(-3000),
      ffmpegSubtitleLogDetected: false,
      ffmpegSubtitleFailureDetected: true,
      renderedFileSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
      originalFileSize: fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0,
      renderedDifferentFromOriginal: false
    }).catch(() => {});
    await updateJob(jobId, { status: 'failed', error_message: error.message }).catch(() => {});
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

async function loop() {
  console.info('TalkGlobal video worker started', { bucket: BUCKET, pollMs: POLL_INTERVAL_MS });
  for (;;) {
    try {
      const job = await claimNextJob();
      if (job) await processJob(job);
      else await sleep(POLL_INTERVAL_MS);
    } catch (error) {
      console.error('worker-loop-error', { message: error.message });
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

loop().catch((error) => {
  console.error('worker-fatal-error', error);
  process.exit(1);
});
