import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const FILES_BUCKET = 'ecos-files';
const SIGNED_URL_EXPIRES_IN = 10 * 60;
const DETAIL_FIELDS = 'id,title,author_name,author_email,author_social,creation_type,short_description,age_rating,status,cover_url,external_link,file_url,created_at';

class EcosConfigError extends Error {}
class EcosAuthError extends Error {}
class EcosInputError extends Error {}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function requestUrl(request) {
  const host = request.headers.host || 'localhost';
  return new URL(request.url || '/', `http://${host}`);
}

function getBearerToken(request) {
  const header = String(request.headers.authorization || '').trim();
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function sameSecret(candidate, expected) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

function requireAdmin(request) {
  const expected = String(process.env.ADMIN_SECRET || '').trim();
  if (!expected) throw new EcosConfigError('ADMIN_SECRET não configurado.');

  const token = getBearerToken(request);
  if (!token || !sameSecret(token, expected)) throw new EcosAuthError('Acesso administrativo negado.');
}

function getSupabaseAdmin() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) throw new EcosConfigError('Supabase administrativo não configurado.');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function parseStoredFiles(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function normalizePrivateFilePath(value) {
  const candidate = value && typeof value === 'object'
    ? value.path || value.file_url || value.url || value.href
    : value;
  const raw = String(candidate || '').trim();
  if (!raw) return '';

  let storagePath = raw;
  try {
    storagePath = new URL(raw).pathname;
  } catch {}

  const withoutPublicPrefix = storagePath.replace(/^\/?storage\/v1\/object\/(?:public|sign)\//, '');
  const withoutBucket = withoutPublicPrefix.startsWith(`${FILES_BUCKET}/`)
    ? withoutPublicPrefix.slice(`${FILES_BUCKET}/`.length)
    : withoutPublicPrefix;

  if (!/^submissions\/[0-9a-f-]{36}\/[a-z0-9-]+\.(?:pdf|jpg|jpeg|png|webp)$/i.test(withoutBucket)) {
    return '';
  }

  return withoutBucket;
}

function safePublicCoverUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.pathname.includes(`/${FILES_BUCKET}/`)) {
      return url.href;
    }
  } catch {}

  return '';
}

function fileNameFromPath(path) {
  const decoded = decodeURIComponent(String(path || '').split('/').pop() || '');
  return decoded || 'Arquivo enviado';
}

async function signedUrl(supabase, value) {
  const files = parseStoredFiles(value);
  const path = files.map(normalizePrivateFilePath).find(Boolean);
  if (!path) return { signedUrl: '', fileName: '' };

  const { data, error } = await supabase
    .storage
    .from(FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);

  if (error) {
    console.warn('[ecos-admin-submission] signed URL unavailable', { message: error.message });
    return { signedUrl: '', fileName: fileNameFromPath(path) };
  }

  return { signedUrl: data?.signedUrl || '', fileName: fileNameFromPath(path) };
}

function adminItem(row, filePreview, coverPreview) {
  if (!row) return null;
  const {
    file_url,
    cover_url,
    ...safeRow
  } = row;

  return {
    ...safeRow,
    cover_url: safePublicCoverUrl(cover_url),
    cover_signed_url: coverPreview.signedUrl || '',
    file_signed_url: filePreview.signedUrl || '',
    file_name: filePreview.fileName || 'Arquivo enviado',
    signed_url_expires_in: filePreview.signedUrl ? SIGNED_URL_EXPIRES_IN : null
  };
}

async function getSubmission(request, response) {
  requireAdmin(request);
  const id = String(requestUrl(request).searchParams.get('id') || '').trim();
  if (!id) throw new EcosInputError('ID do envio não informado.');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ecos_submissions')
    .select(DETAIL_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return sendJson(response, 404, { ok: false, error: 'ecos_submission_not_found', message: 'Envio não encontrado.' });

  const filePreview = await signedUrl(supabase, data.file_url);
  const coverPreview = await signedUrl(supabase, data.cover_url);
  return sendJson(response, 200, { ok: true, item: adminItem(data, filePreview, coverPreview) });
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return sendJson(response, 405, { ok: false, message: 'Use GET para abrir um envio.' });
    }

    return await getSubmission(request, response);
  } catch (error) {
    if (error instanceof EcosAuthError) {
      return sendJson(response, 401, { ok: false, error: 'ecos_admin_unauthorized', message: error.message });
    }
    if (error instanceof EcosInputError) {
      return sendJson(response, 400, { ok: false, error: 'ecos_admin_bad_request', message: error.message });
    }

    const message = error instanceof EcosConfigError
      ? error.message
      : 'Não foi possível abrir este envio agora.';
    return sendJson(response, 500, { ok: false, error: 'ecos_admin_submission_failed', message });
  }
}
