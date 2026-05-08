import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export const config = { api: { bodyParser: false } };
export const maxDuration = 300;

const execFileAsync = promisify(execFile);
const ffprobePath = ffprobeStatic?.path;
const STATUSES = ['created', 'uploaded', 'transcribing', 'translating', 'generating_srt', 'rendering', 'completed', 'failed'];
const ACCEPTED = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const ACCEPTED_EXTENSIONS = new Set(['.mp4', '.mov', '.webm']);
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

function getEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração do backend incompleta: ${name}`);
  return value;
}

function getBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'video-translations';
}

function getSupabase() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getOpenAI() {
  return new OpenAI({ apiKey: getEnv('OPENAI_API_KEY') });
}

function safeName(name = 'video.mp4') {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'video.mp4';
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}


async function ensureBucket(supabase, bucket) {
  const { data } = await supabase.storage.getBucket(bucket);
  if (data?.id) return;
  const { error } = await supabase.storage.createBucket(bucket, { public: false });
  if (error && !String(error.message || '').toLowerCase().includes('already exists')) {
    throw new Error(`Erro ao preparar Storage: ${error.message}`);
  }
}
function validateVideoMetadata({ fileName, fileSize, fileType, plan }) {
  const maxMb = Number(process.env.MAX_FREE_VIDEO_MB || 50);
  const maxBytes = maxMb * 1024 * 1024;
  const cleanName = safeName(fileName || 'video.mp4');
  const extension = path.extname(cleanName).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(extension)) throw new Error('Formato não aceito. Use MP4, MOV ou WEBM.');
  if (fileType && !ACCEPTED.has(fileType)) throw new Error('Formato não aceito. Use MP4, MOV ou WEBM.');
  if ((plan || 'free') !== 'premium' && Number(fileSize || 0) > maxBytes) {
    throw new Error(`No plano grátis, use vídeos de até ${maxMb} MB nesta fase.`);
  }
  return cleanName;
}

async function createJob(request, response) {
  const body = await parseJsonBody(request);
  const supabase = getSupabase();
  const bucket = getBucket();
  await ensureBucket(supabase, bucket);
  const jobId = randomUUID();
  const fileName = validateVideoMetadata(body);
  const originalPath = `${jobId}/original-${fileName}`;
  const now = new Date().toISOString();
  const row = {
    id: jobId,
    user_id: null,
    original_file_path: originalPath,
    original_file_name: fileName,
    original_language: body.sourceLanguage || 'auto',
    target_language: body.targetLanguage || 'pt',
    caption_style: body.captionStyle || 'Clean',
    status: 'created',
    file_size_bytes: body.fileSize || null,
    plan: body.plan === 'premium' ? 'premium' : 'free',
    has_watermark: body.plan !== 'premium',
    is_hd: false,
    priority: body.plan === 'premium' ? 'high' : 'normal',
    created_at: now,
    updated_at: now
  };

  const { error } = await supabase.from('video_translation_jobs').insert(row);
  if (error) throw new Error(`Erro ao criar job no Supabase: ${error.message}`);

  const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).createSignedUploadUrl(originalPath);
  if (uploadError) {
    await updateJob(supabase, jobId, { status: 'failed', error_message: uploadError.message }).catch(() => {});
    throw new Error(`Erro ao criar upload direto: ${uploadError.message}`);
  }

  return response.status(201).json({
    ok: true,
    jobId,
    status: 'created',
    bucket,
    storagePath: originalPath,
    upload: {
      supabaseUrl: getEnv('SUPABASE_URL'),
      anonKey: getEnv('SUPABASE_ANON_KEY'),
      bucket,
      path: uploadData.path || originalPath,
      token: uploadData.token,
      signedUrl: uploadData.signedUrl
    }
  });
}

async function updateJob(supabase, jobId, patch) {
  const { error } = await supabase
    .from('video_translation_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw new Error(`Erro ao atualizar job: ${error.message}`);
}

async function getJobRow(supabase, jobId) {
  const { data, error } = await supabase.from('video_translation_jobs').select('*').eq('id', jobId).single();
  if (error) throw new Error(`Job não encontrado: ${error.message}`);
  return data;
}

async function signedUrl(supabase, bucket, filePath) {
  if (!filePath) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 30);
  if (error) return null;
  return data?.signedUrl || null;
}

async function downloadText(supabase, bucket, filePath) {
  if (!filePath) return '';
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) return '';
  return await data.text();
}

async function readJob(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || 'talkglobalapp.com'}`);
  const jobId = url.searchParams.get('jobId');
  if (!jobId) return response.status(400).json({ error: 'jobId é obrigatório' });
  const supabase = getSupabase();
  const bucket = getBucket();
  const job = await getJobRow(supabase, jobId);
  const result = { ok: true, jobId, status: job.status, error: job.error_message || null };
  if (job.status === 'completed') {
    result.srtUrl = await signedUrl(supabase, bucket, job.srt_path);
    result.videoUrl = await signedUrl(supabase, bucket, job.final_video_path);
    result.srt = await downloadText(supabase, bucket, job.srt_path);
  }
  return response.status(200).json(result);
}

async function downloadStorageFile(supabase, bucket, filePath, outputPath) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) throw new Error(`Erro ao baixar vídeo original: ${error?.message || 'arquivo indisponível'}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return buffer.length;
}

async function getDuration(inputPath) {
  if (!ffprobePath) return null;
  try {
    const { stdout } = await execFileAsync(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', inputPath], { timeout: 15000 });
    const value = Number.parseFloat(stdout.trim());
    return Number.isFinite(value) ? Math.round(value) : null;
  } catch {
    return null;
  }
}

async function extractAudio(inputPath, audioPath) {
  await execFileAsync(ffmpegPath, ['-y', '-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', audioPath], { timeout: 120000 });
}

async function transcribeAudio(openai, audioPath) {
  const result = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment']
  });
  const segments = Array.isArray(result.segments) && result.segments.length
    ? result.segments.map((segment, index) => ({ index, start: segment.start || 0, end: segment.end || Math.max((segment.start || 0) + 3, 3), text: segment.text || '' }))
    : [{ index: 0, start: 0, end: 5, text: result.text || '' }];
  return segments.filter((segment) => segment.text.trim());
}

async function translateSegments(openai, segments, targetLanguage, sourceLanguage) {
  const target = LANGUAGE_LABELS[targetLanguage] || targetLanguage;
  const source = LANGUAGE_LABELS[sourceLanguage] || sourceLanguage || 'automaticamente';
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Você traduz legendas de vídeo com naturalidade. Preserve intenção, emoção, contexto, gírias e sentido real. Não traduza palavra por palavra. Responda apenas JSON válido.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          instruction: `Traduza de ${source} para ${target}. Retorne exatamente o mesmo número de segmentos.`,
          schema: { segments: [{ index: 0, text: 'texto traduzido' }] },
          segments: segments.map(({ index, text }) => ({ index, text }))
        })
      }
    ]
  });
  const raw = completion.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
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
  const centiseconds = Math.max(0, Math.round((value % 1) * 100)).toString().padStart(2, '0');
  const total = Math.max(0, Math.floor(value));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const sec = Math.floor(total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}.${centiseconds}`;
}

function makeSrt(segments) {
  return segments.map((segment, index) => `${index + 1}\n${toSrtTime(segment.start)} --> ${toSrtTime(segment.end)}\n${segment.text.replace(/\n+/g, ' ')}\n`).join('\n');
}

function escapeFilterPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function escapeAssText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

function assStyle(style) {
  const base = {
    font: 'Arial',
    size: 42,
    color: '&H00FFFFFF',
    outline: '&H00000000',
    back: '&H99000000',
    bold: 0,
    italic: 0,
    borderStyle: 1,
    outlineWidth: 3,
    shadow: 1,
    alignment: 2,
    marginV: 82
  };
  if (style === 'TikTok Bold') return { ...base, size: 54, bold: 1, outlineWidth: 5, shadow: 2, marginV: 96 };
  if (style === 'Cinema') return { ...base, font: 'Georgia', size: 40, outlineWidth: 2, shadow: 1, marginV: 86 };
  if (style === 'Anime') return { ...base, size: 46, color: '&H00D7FEFF', outline: '&H003B1D00', bold: 1, outlineWidth: 4, shadow: 2, marginV: 90 };
  if (style === 'Minimal') return { ...base, size: 38, outline: '&H66000000', outlineWidth: 1, shadow: 0, marginV: 72 };
  return base;
}

function styleLine(name, style) {
  return `Style: ${[
    name, style.font, style.size, style.color, '&H000000FF', style.outline, style.back,
    style.bold, style.italic, 0, 0, 100, 100, 0, 0, style.borderStyle, style.outlineWidth,
    style.shadow, style.alignment, 48, 48, style.marginV, 1
  ].join(',')}`;
}

function makeAss(segments, style, watermark, durationSeconds) {
  const caption = assStyle(style);
  const watermarkStyle = {
    font: 'Arial',
    size: 28,
    color: '&H22FFFFFF',
    outline: '&H66000000',
    back: '&H99000000',
    bold: 1,
    italic: 0,
    borderStyle: 1,
    outlineWidth: 1,
    shadow: 0,
    alignment: 9,
    marginV: 34
  };
  const maxEnd = Math.max(durationSeconds || 0, ...segments.map((segment) => Number(segment.end) || 0), 1);
  const events = segments.map((segment) => {
    const start = toAssTime(segment.start || 0);
    const end = toAssTime(segment.end || Math.max((segment.start || 0) + 3, 3));
    return `Dialogue: 0,${start},${end},Caption,,0000,0000,0000,,${escapeAssText(segment.text)}`;
  });
  if (watermark) {
    events.unshift(`Dialogue: 1,0:00:00.00,${toAssTime(maxEnd)},Watermark,,0000,0048,0000,,Translated with TalkGlobal AI`);
  }
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    'ScaledBorderAndShadow: yes',
    'WrapStyle: 2',
    'PlayResX: 1080',
    'PlayResY: 1920',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine('Caption', caption),
    styleLine('Watermark', watermarkStyle),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    ''
  ].join('\n');
}

async function renderVideo(inputPath, assPath, outputPath) {
  const filter = `subtitles='${escapeFilterPath(assPath)}'`;
  await execFileAsync(ffmpegPath, ['-y', '-i', inputPath, '-vf', filter, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputPath], { timeout: 240000 });
}


async function processStoredJob(jobId, options = {}) {
  const supabase = getSupabase();
  const openai = getOpenAI();
  const bucket = getBucket();
  await ensureBucket(supabase, bucket);
  const job = await getJobRow(supabase, jobId);
  const sourceLanguage = options.sourceLanguage || job.original_language || 'auto';
  const targetLanguage = options.targetLanguage || job.target_language || 'pt';
  const captionStyleValue = options.captionStyle || job.caption_style || 'Clean';
  const plan = options.plan || job.plan || 'free';
  const hasWatermark = plan !== 'premium';

  if (!jobId) throw new Error('jobId é obrigatório');
  if (!job.original_file_path) throw new Error('Arquivo original não encontrado no job.');
  if (!ffmpegPath) throw new Error('FFmpeg não está disponível no backend.');

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), `talkglobal-${jobId}-`));
  const inputName = safeName(job.original_file_name || 'video.mp4');
  const inputPath = path.join(workdir, inputName);
  const audioPath = path.join(workdir, 'audio.mp3');
  const srtPath = path.join(workdir, 'translated.srt');
  const assPath = path.join(workdir, 'translated.ass');
  const outputPath = path.join(workdir, 'translated.mp4');
  const srtStoragePath = `${jobId}/translated.srt`;
  const finalVideoStoragePath = `${jobId}/translated.mp4`;

  try {
    const downloadedBytes = await downloadStorageFile(supabase, bucket, job.original_file_path, inputPath);
    const duration = await getDuration(inputPath);
    const maxSeconds = Number(process.env.MAX_FREE_VIDEO_SECONDS || 90);
    if (plan !== 'premium' && duration && duration > maxSeconds) {
      throw new Error(`No plano grátis, use vídeos de até ${maxSeconds} segundos.`);
    }

    await updateJob(supabase, jobId, {
      status: 'transcribing',
      original_file_name: inputName,
      original_language: sourceLanguage,
      target_language: targetLanguage,
      caption_style: captionStyleValue,
      duration_seconds: duration,
      file_size_bytes: downloadedBytes,
      plan,
      has_watermark: hasWatermark
    });

    await extractAudio(inputPath, audioPath);
    const originalSegments = await transcribeAudio(openai, audioPath);
    if (!originalSegments.length) throw new Error('Não foi possível detectar falas no vídeo.');

    await updateJob(supabase, jobId, { status: 'translating' });
    const translatedSegments = await translateSegments(openai, originalSegments, targetLanguage, sourceLanguage);

    await updateJob(supabase, jobId, { status: 'generating_srt' });
    const srt = makeSrt(translatedSegments);
    const ass = makeAss(translatedSegments, captionStyleValue, hasWatermark, duration);
    fs.writeFileSync(srtPath, srt, 'utf8');
    fs.writeFileSync(assPath, ass, 'utf8');
    const uploadSrt = await supabase.storage.from(bucket).upload(srtStoragePath, Buffer.from(srt, 'utf8'), { contentType: 'application/x-subrip; charset=utf-8', upsert: true });
    if (uploadSrt.error) throw new Error(`Erro ao salvar SRT: ${uploadSrt.error.message}`);

    await updateJob(supabase, jobId, { status: 'rendering', srt_path: srtStoragePath });
    await renderVideo(inputPath, assPath, outputPath);
    const uploadFinal = await supabase.storage.from(bucket).upload(finalVideoStoragePath, fs.readFileSync(outputPath), { contentType: 'video/mp4', upsert: true });
    if (uploadFinal.error) throw new Error(`Erro ao salvar MP4 final: ${uploadFinal.error.message}`);

    await updateJob(supabase, jobId, { status: 'completed', final_video_path: finalVideoStoragePath, srt_path: srtStoragePath, error_message: null });
    const videoUrl = await signedUrl(supabase, bucket, finalVideoStoragePath);
    const srtUrl = await signedUrl(supabase, bucket, srtStoragePath);
    return { ok: true, jobId, status: 'completed', videoUrl, srtUrl, srt };
  } catch (error) {
    await updateJob(supabase, jobId, { status: 'failed', error_message: error.message }).catch(() => {});
    throw error;
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

async function startJob(request, response) {
  const body = await parseJsonBody(request);
  const jobId = body.jobId;
  if (!jobId) return response.status(400).json({ error: 'jobId é obrigatório' });

  const supabase = getSupabase();
  const job = await getJobRow(supabase, jobId);
  if (job.status !== 'created' && job.status !== 'uploaded' && job.status !== 'failed') {
    return response.status(409).json({ error: `Job já está em processamento: ${job.status}` });
  }

  await updateJob(supabase, jobId, {
    status: 'uploaded',
    original_language: body.sourceLanguage || job.original_language || 'auto',
    target_language: body.targetLanguage || job.target_language || 'pt',
    caption_style: body.captionStyle || job.caption_style || 'Clean',
    plan: body.plan === 'premium' ? 'premium' : 'free',
    has_watermark: body.plan !== 'premium',
    error_message: null
  });

  // Fase 2: trocar esta chamada direta por uma fila/worker externo
  // em Railway, Render, Fly.io ou Google Cloud Run. A Vercel deve
  // continuar apenas com site e APIs leves; FFmpeg fica no worker.
  try {
    const result = await processStoredJob(jobId, body);
    return response.status(200).json(result);
  } catch (error) {
    return response.status(500).json({ ok: false, jobId, status: 'failed', error: error.message });
  }
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') return await readJob(request, response);
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      return response.status(405).json({ error: 'Method not allowed' });
    }

    const contentType = request.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const url = new URL(request.url, `https://${request.headers.host || 'talkglobalapp.com'}`);
      const action = url.searchParams.get('action');
      if (action === 'create') return await createJob(request, response);
      if (action === 'start') return await startJob(request, response);
    }
    if (contentType.includes('multipart/form-data')) {
      return response.status(413).json({
        error: 'O vídeo não deve ser enviado para a Vercel. Envie direto para o Supabase Storage e chame action=start com JSON.'
      });
    }
    return response.status(400).json({ error: 'Requisição inválida. Use JSON leve.' });
  } catch (error) {
    return response.status(500).json({ ok: false, status: 'failed', error: error.message || 'Erro inesperado no processamento.' });
  }
}
