import { createClient } from '@supabase/supabase-js';

const EXPECTED_COVERS_BUCKET = 'ecos-covers';
const EXPECTED_FILES_BUCKET = 'ecos-files';
const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;
const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const SAFE_PATH_PATTERN = /^submissions\/[0-9a-f-]{36}\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|pdf)$/;

class PublicSubmissionError extends Error {}
class EcosConfigError extends Error {}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new EcosConfigError('Envio temporariamente indisponível. Tente novamente mais tarde.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getStorageBuckets() {
  const coversBucket = process.env.SUPABASE_COVERS_BUCKET;
  const filesBucket = process.env.SUPABASE_FILES_BUCKET;
  if (!coversBucket || !filesBucket) {
    throw new EcosConfigError('Envio temporariamente indisponível. Tente novamente mais tarde.');
  }
  if (coversBucket !== EXPECTED_COVERS_BUCKET || filesBucket !== EXPECTED_FILES_BUCKET) {
    throw new EcosConfigError('Envio temporariamente indisponível. Tente novamente mais tarde.');
  }
  return { coversBucket, filesBucket };
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  const raw = await new Promise((resolve, reject) => {
    if (typeof request.body === 'string') return resolve(request.body);
    if (Buffer.isBuffer(request.body)) return resolve(request.body.toString('utf8'));

    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new PublicSubmissionError('Envio inválido.');
  }
}

function cleanText(value, maxLength = 4000) {
  return String(value || '').trim().slice(0, maxLength);
}

function validateMetadata(body) {
  const required = {
    title: cleanText(body.title, 180),
    author_name: cleanText(body.author_name || body.penName, 140) || 'Autor anônimo',
    author_email: cleanText(body.author_email || body.email, 180),
    creation_type: cleanText(body.creation_type || body.creationType, 80),
    short_description: cleanText(body.short_description || body.summary, 700),
    age_rating: cleanText(body.age_rating || body.rating, 20)
  };

  for (const value of Object.values(required)) {
    if (!value) throw new PublicSubmissionError('Preencha todos os campos obrigatórios antes de enviar.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(required.author_email)) {
    throw new PublicSubmissionError('E-mail inválido.');
  }

  if (body.confirm_authorship !== true || body.allow_public_display !== true) {
    throw new PublicSubmissionError('Confirme a autoria e a autorização de exibição antes de enviar.');
  }

  return {
    ...required,
    social_url: cleanText(body.social_url || body.social, 500) || null,
    content_text: cleanText(body.content_text || body.contentText, 20000) || null,
    external_link: cleanText(body.external_link || body.externalLink, 1000) || null
  };
}

function validateUploadedFile(file, allowedTypes, maxSize, label) {
  const path = cleanText(file?.path, 600);
  const type = cleanText(file?.type, 120);
  const size = Number(file?.size || 0);
  const originalName = cleanText(file?.name, 220);

  if (!path || !SAFE_PATH_PATTERN.test(path)) throw new PublicSubmissionError(`${label} inválido.`);
  if (!allowedTypes.has(type)) throw new PublicSubmissionError(`${label} com tipo inválido.`);
  if (!Number.isFinite(size) || size <= 0 || size > maxSize) throw new PublicSubmissionError(`${label} com tamanho inválido.`);

  return { path, type, size, name: originalName || null };
}

async function createSubmission(request, response) {
  const body = await readJson(request);
  const metadata = validateMetadata(body);
  const cover = validateUploadedFile(body.cover, ALLOWED_COVER_TYPES, MAX_COVER_SIZE, 'Capa');
  const files = Array.isArray(body.files) ? body.files : [];

  if (files.length > MAX_FILES) throw new PublicSubmissionError(`Envie no máximo ${MAX_FILES} arquivos da obra.`);
  const uploadedFiles = files.map((file) => validateUploadedFile(file, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, 'Arquivo'));

  const supabase = getSupabaseAdmin();
  const { coversBucket, filesBucket } = getStorageBuckets();
  const { data: publicCover } = supabase.storage.from(coversBucket).getPublicUrl(cover.path);
  const fileUrls = uploadedFiles.map((file, index) => ({
    bucket: filesBucket,
    path: file.path,
    name: file.name || `Capítulo ${index + 1}`,
    type: file.type,
    size: file.size,
    chapter_number: index + 1
  }));

  const { data, error } = await supabase
    .from('ecos_submissions')
    .insert({
      title: metadata.title,
      author_name: metadata.author_name,
      author_email: metadata.author_email,
      social_url: metadata.social_url,
      creation_type: metadata.creation_type,
      short_description: metadata.short_description,
      content_text: metadata.content_text,
      external_link: metadata.external_link,
      cover_url: publicCover.publicUrl,
      file_url: fileUrls.length ? JSON.stringify(fileUrls) : null,
      age_rating: metadata.age_rating,
      status: 'pending'
    })
    .select('id, cover_url, file_url, status')
    .single();

  if (error) throw error;
  return sendJson(response, 201, { ok: true, submission: data });
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      return sendJson(response, 200, {
        ok: false,
        message: 'Use POST to submit Ecos de Hélicon entries.'
      });
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, {
        ok: false,
        message: 'Use POST to submit Ecos de Hélicon entries.'
      });
    }

    return await createSubmission(request, response);
  } catch (error) {
    const safeMessage = error instanceof PublicSubmissionError || error instanceof EcosConfigError
      ? error.message
      : 'Não foi possível processar o Eco agora.';
    return sendJson(response, 400, {
      ok: false,
      error: 'ecos_submission_failed',
      message: safeMessage
    });
  }
}
