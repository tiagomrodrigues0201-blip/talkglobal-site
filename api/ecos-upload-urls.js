import { createClient } from '@supabase/supabase-js';

const EXPECTED_COVERS_BUCKET = 'ecos-covers';
const EXPECTED_FILES_BUCKET = 'ecos-files';
const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 3;
const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const EXTENSIONS_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

class PublicUploadError extends Error {}
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
    throw new PublicUploadError('Envio inválido.');
  }
}

function cleanText(value, maxLength = 4000) {
  return String(value || '').trim().slice(0, maxLength);
}

function validateFileDescriptor(file, allowedTypes, maxSize, label) {
  const name = cleanText(file?.name, 220);
  const type = cleanText(file?.type, 120);
  const size = Number(file?.size || 0);

  if (!name) throw new PublicUploadError(`${label} sem nome.`);
  if (!allowedTypes.has(type)) throw new PublicUploadError(`${label} com tipo inválido.`);
  if (!Number.isFinite(size) || size <= 0 || size > maxSize) throw new PublicUploadError(`${label} com tamanho inválido.`);

  return {
    name,
    type,
    size,
    extension: EXTENSIONS_BY_TYPE[type]
  };
}

async function signedUpload(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;
  return data;
}

async function createUploadUrls(request, response) {
  const body = await readJson(request);
  const title = cleanText(body.title, 180);
  const cover = validateFileDescriptor(body.cover, ALLOWED_COVER_TYPES, MAX_COVER_SIZE, 'Capa');
  const files = Array.isArray(body.files) ? body.files : [];

  if (!title) throw new PublicUploadError('Informe o título da criação.');
  if (files.length > MAX_FILES) throw new PublicUploadError('Envie no máximo 3 arquivos da obra.');

  const workFiles = files.map((file) => validateFileDescriptor(file, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, 'Arquivo'));
  const supabase = getSupabaseAdmin();
  const { coversBucket, filesBucket } = getStorageBuckets();
  const submissionDraftId = crypto.randomUUID();
  const timestamp = Date.now();

  const coverPath = `submissions/${submissionDraftId}/cover-${timestamp}.${cover.extension}`;
  const coverUpload = await signedUpload(supabase, coversBucket, coverPath);
  const { data: publicCover } = supabase.storage.from(coversBucket).getPublicUrl(coverPath);

  const fileUploads = [];
  for (const [index, file] of workFiles.entries()) {
    const path = `submissions/${submissionDraftId}/part-${index + 1}-${timestamp}.${file.extension}`;
    const upload = await signedUpload(supabase, filesBucket, path);
    fileUploads.push({
      bucket: filesBucket,
      path,
      signedUrl: upload.signedUrl,
      token: upload.token,
      name: file.name,
      type: file.type,
      size: file.size
    });
  }

  return sendJson(response, 200, {
    ok: true,
    submissionDraftId,
    cover: {
      bucket: coversBucket,
      path: coverPath,
      signedUrl: coverUpload.signedUrl,
      token: coverUpload.token,
      cover_url: publicCover.publicUrl,
      name: cover.name,
      type: cover.type,
      size: cover.size
    },
    files: fileUploads
  });
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, {
        ok: false,
        message: 'Use POST to request Ecos de Hélicon upload URLs.'
      });
    }

    return await createUploadUrls(request, response);
  } catch (error) {
    const safeMessage = error instanceof PublicUploadError || error instanceof EcosConfigError
      ? error.message
      : 'Envio temporariamente indisponível. Tente novamente mais tarde.';
    return sendJson(response, 400, {
      ok: false,
      error: 'ecos_upload_url_failed',
      message: safeMessage
    });
  }
}
