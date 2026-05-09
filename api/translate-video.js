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
    original_video_path: originalPath,
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
    const srt = await downloadText(supabase, bucket, job.srt_path);
    result.srtUrl = await signedUrl(supabase, bucket, job.srt_path);
    result.videoUrl = await signedUrl(supabase, bucket, job.rendered_video_path);
    result.srt = srt;
    Object.assign(result, firstCaptionFromSrt(srt));
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

async function getVideoInfo(inputPath) {
  const fallback = { duration: null, width: 1080, height: 1920 };
  if (!ffprobePath) return fallback;
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json',
      inputPath
    ], { timeout: 15000 });
    const parsed = JSON.parse(stdout || '{}');
    const stream = Array.isArray(parsed.streams) ? parsed.streams[0] : null;
    const duration = Number.parseFloat(parsed.format?.duration);
    const width = Number(stream?.width);
    const height = Number(stream?.height);
    return {
      duration: Number.isFinite(duration) ? Math.round(duration) : null,
      width: Number.isFinite(width) && width > 0 ? width : fallback.width,
      height: Number.isFinite(height) && height > 0 ? height : fallback.height
    };
  } catch {
    return fallback;
  }
}

async function getDuration(inputPath) {
  return (await getVideoInfo(inputPath)).duration;
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

function firstCaptionFromSegments(segments) {
  const first = Array.isArray(segments) ? segments.find((segment) => String(segment.text || '').trim()) : null;
  if (!first) return { firstCaptionStart: 0, firstCaptionText: '' };
  return {
    firstCaptionStart: Math.max(0, Number(first.start) || 0),
    firstCaptionText: String(first.text || '').trim()
  };
}

function firstCaptionFromSrt(srt) {
  const match = String(srt || '').match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->[\s\S]*?\n([^\n]+)/);
  if (!match) return { firstCaptionStart: 0, firstCaptionText: '' };
  const [, h, m, sec, ms, text] = match;
  return {
    firstCaptionStart: Number(h) * 3600 + Number(m) * 60 + Number(sec) + Number(ms) / 1000,
    firstCaptionText: String(text || '').trim()
  };
}

function escapeFilterPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
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
  return wrapAssText(text)
    .replace(/\\(?!N)/g, '\\\\')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .trim();
}

function assStyle(style, video = {}) {
  const shortSide = Math.max(360, Math.min(Number(video.width) || 1080, Number(video.height) || 1920));
  const baseSize = Math.max(28, Math.round(shortSide * 0.052));
  const baseMargin = Math.max(32, Math.round((Number(video.height) || 1920) * 0.075));
  const base = {
    font: 'Arial',
    size: baseSize,
    color: '&H00FFFFFF',
    outline: '&H00000000',
    back: '&HAA000000',
    bold: 1,
    italic: 0,
    borderStyle: 3,
    outlineWidth: 2,
    shadow: 0,
    alignment: 5,
    marginV: baseMargin
  };
  if (style === 'TikTok Bold') return { ...base, size: Math.round(baseSize * 1.18), bold: 1, outlineWidth: 3, marginV: Math.round(baseMargin * 1.08) };
  if (style === 'Cinema') return { ...base, font: 'Georgia', size: Math.round(baseSize * 0.94), outlineWidth: 1, marginV: Math.round(baseMargin * 0.9) };
  if (style === 'Anime') return { ...base, size: Math.round(baseSize * 1.08), color: '&H00D7FEFF', outline: '&H003B1D00', bold: 1, outlineWidth: 3 };
  if (style === 'Minimal') return { ...base, size: Math.round(baseSize * 0.9), back: '&H66000000', outlineWidth: 1, shadow: 0, marginV: Math.round(baseMargin * 0.78) };
  return base;
}

function styleLine(name, style) {
  return `Style: ${[
    name, style.font, style.size, style.color, '&H000000FF', style.outline, style.back,
    style.bold, style.italic, 0, 0, 100, 100, 0, 0, style.borderStyle, style.outlineWidth,
    style.shadow, style.alignment, 48, 48, style.marginV, 1
  ].join(',')}`;
}

function makeAss(segments, style, watermark, durationSeconds, video = {}) {
  const width = Math.max(360, Number(video.width) || 1080);
  const height = Math.max(360, Number(video.height) || 1920);
  const caption = assStyle(style, { width, height });
  const watermarkStyle = {
    font: 'Arial',
    size: Math.max(18, Math.round(Math.min(width, height) * 0.028)),
    color: '&H00FFFFFF',
    outline: '&H00000000',
    back: '&HAA000000',
    bold: 1,
    italic: 0,
    borderStyle: 1,
    outlineWidth: 1,
    shadow: 0,
    alignment: 8,
    marginV: Math.max(20, Math.round(height * 0.045))
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
    'WrapStyle: 0',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
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

function ffmpegCommandForLog(args) {
  return [ffmpegPath, ...args].map((part) => {
    const value = String(part);
    return /\s/.test(value) ? JSON.stringify(value) : value;
  }).join(' ');
}

async function runFfmpeg(args, timeout = 240000) {
  const command = ffmpegCommandForLog(args);
  console.info('talkglobal-ffmpeg-command', { command });
  try {
    const result = await execFileAsync(ffmpegPath, args, { timeout });
    return { command, stdout: result.stdout || '', stderr: result.stderr || '' };
  } catch (error) {
    console.error('talkglobal-ffmpeg-failed', { command, stderr: error.stderr || '', message: error.message });
    error.message = `FFmpeg falhou: ${error.message}`;
    error.ffmpegCommand = command;
    error.ffmpegStderr = error.stderr || '';
    throw error;
  }
}

async function renderVideo(inputPath, assPath, outputPath) {
  if (!fs.existsSync(assPath) || fs.statSync(assPath).size <= 0) {
    throw new Error('Arquivo ASS de legendas não foi criado corretamente.');
  }

  const filter = `ass=${escapeFilterPath(assPath)}`;
  const args = [
    '-y',
    '-loglevel', 'verbose',
    '-i', inputPath,
    '-vf', filter,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath
  ];
  const result = await runFfmpeg(args, 240000);
  return { ...result, filter };
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
  const originalVideoPath = job.original_video_path || job.original_file_path;
  if (!originalVideoPath) throw new Error('Arquivo original não encontrado no job.');
  if (!ffmpegPath) throw new Error('FFmpeg não está disponível no backend.');

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), `talkglobal-${jobId}-`));
  const inputName = safeName(job.original_file_name || 'video.mp4');
  const inputPath = path.join(workdir, inputName);
  const audioPath = path.join(workdir, 'audio.mp3');
  const srtPath = path.join(workdir, 'translated.srt');
  const assPath = path.join(workdir, 'translated.ass');
  const outputPath = path.join(workdir, 'translated.mp4');
  const srtStoragePath = `${jobId}/translated.srt`;
  const renderedVideoStoragePath = `${jobId}/translated.mp4`;

  try {
    const downloadedBytes = await downloadStorageFile(supabase, bucket, originalVideoPath, inputPath);
    const videoInfo = await getVideoInfo(inputPath);
    const duration = videoInfo.duration;
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
    const ass = makeAss(translatedSegments, captionStyleValue, hasWatermark, duration, videoInfo);
    fs.writeFileSync(srtPath, srt, 'utf8');
    fs.writeFileSync(assPath, ass, 'utf8');
    const uploadSrt = await supabase.storage.from(bucket).upload(srtStoragePath, Buffer.from(srt, 'utf8'), { contentType: 'application/x-subrip; charset=utf-8', upsert: true });
    if (uploadSrt.error) throw new Error(`Erro ao salvar SRT: ${uploadSrt.error.message}`);

    await updateJob(supabase, jobId, { status: 'rendering', srt_path: srtStoragePath });
    const renderResult = await renderVideo(inputPath, assPath, outputPath);

    const renderedFileExists = fs.existsSync(outputPath);
    const renderedFileSize = renderedFileExists ? fs.statSync(outputPath).size : 0;
    const inputRealPath = fs.realpathSync(inputPath);
    const outputRealPath = renderedFileExists ? fs.realpathSync(outputPath) : '';
    const renderedIsSeparateFile = Boolean(outputRealPath && outputRealPath !== inputRealPath);
    const renderedDiffersFromOriginal = renderedFileExists && renderedFileSize > 0 && !fs.readFileSync(outputPath).equals(fs.readFileSync(inputPath));

    const filterWasApplied = Boolean(renderResult?.filter?.includes('ass=') && renderResult.filter.includes('translated.ass'));
    const ffmpegSubtitleLogDetected = /Parsed_ass|libass|Event at|ass/i.test(renderResult?.stderr || '');

    console.info('talkglobal-video-render', {
      jobId,
      inputVideoPath: inputPath,
      srtPath,
      assPath,
      outputVideoPath: outputPath,
      videoWidth: videoInfo.width,
      videoHeight: videoInfo.height,
      renderedFileExists,
      renderedFileSize,
      ffmpegCommand: renderResult.command,
      ffmpegFilter: renderResult.filter,
      assPreview: ass.slice(0, 900),
      ffmpegStderrTail: String(renderResult.stderr || '').slice(-1800),
      filterWasApplied,
      ffmpegSubtitleLogDetected
    });

    if (!filterWasApplied || !ffmpegSubtitleLogDetected) {
      throw new Error('FFmpeg não confirmou a aplicação do filtro ASS de legendas. O MP4 final não será liberado.');
    }
    if (!renderedFileExists || renderedFileSize <= 0) {
      throw new Error('FFmpeg não gerou um MP4 renderizado válido.');
    }
    if (!renderedIsSeparateFile || !renderedDiffersFromOriginal) {
      throw new Error('O MP4 renderizado não é diferente do vídeo original.');
    }

    const renderedBuffer = fs.readFileSync(outputPath);
    const uploadFinal = await supabase.storage.from(bucket).upload(renderedVideoStoragePath, renderedBuffer, { contentType: 'video/mp4', upsert: true });
    if (uploadFinal.error) throw new Error(`Erro ao salvar MP4 renderizado: ${uploadFinal.error.message}`);

    await updateJob(supabase, jobId, {
      status: 'completed',
      rendered_video_path: renderedVideoStoragePath,
      final_video_path: renderedVideoStoragePath,
      srt_path: srtStoragePath,
      error_message: null
    });
    const videoUrl = await signedUrl(supabase, bucket, renderedVideoStoragePath);
    const srtUrl = await signedUrl(supabase, bucket, srtStoragePath);
    if (!videoUrl || !srtUrl) throw new Error('Não foi possível gerar URLs assinadas para os arquivos finais.');
    return { ok: true, jobId, status: 'completed', videoUrl, srtUrl, srt, ...firstCaptionFromSegments(translatedSegments) };
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
