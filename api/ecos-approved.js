import { createClient } from '@supabase/supabase-js';

const FILES_BUCKET = 'ecos-files';
const SIGNED_READ_EXPIRES_IN = 10 * 60;
const PUBLIC_FIELDS = 'id,title,author_name,creation_type,short_description,age_rating,cover_url,external_link,created_at';
const DETAIL_FIELDS = `${PUBLIC_FIELDS},file_url`;

class EcosConfigError extends Error {}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function getSupabaseAdmin() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new EcosConfigError('Arquivo de Ecos indisponível no momento.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function requestUrl(request) {
  const host = request.headers.host || 'localhost';
  return new URL(request.url || '/', `http://${host}`);
}

function publicItem(row, signedReadUrl = '') {
  if (!row) return null;
  const {
    id,
    title,
    author_name,
    creation_type,
    short_description,
    age_rating,
    cover_url,
    external_link,
    created_at
  } = row;

  return {
    id,
    title,
    author_name,
    creation_type,
    short_description,
    age_rating,
    cover_url,
    external_link,
    created_at,
    signed_read_url: signedReadUrl || null,
    read_url_expires_in: signedReadUrl ? SIGNED_READ_EXPIRES_IN : null
  };
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

async function signedReadUrl(supabase, fileUrl) {
  const files = parseStoredFiles(fileUrl);
  const firstPath = files.map(normalizePrivateFilePath).find(Boolean);
  if (!firstPath) return '';

  const { data, error } = await supabase
    .storage
    .from(FILES_BUCKET)
    .createSignedUrl(firstPath, SIGNED_READ_EXPIRES_IN);

  if (error) {
    console.warn('[ecos-approved] signed read URL unavailable', { message: error.message });
    return '';
  }
  return data?.signedUrl || '';
}

async function listApproved(request, response) {
  const url = requestUrl(request);
  const id = String(url.searchParams.get('id') || '').trim();
  const supabase = getSupabaseAdmin();
  if (id) {
    const { data, error } = await supabase
      .from('ecos_submissions')
      .select(DETAIL_FIELDS)
      .eq('status', 'approved')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    const readUrl = data ? await signedReadUrl(supabase, data.file_url) : '';
    return sendJson(response, 200, { ok: true, item: publicItem(data, readUrl) });
  }

  const { data, error } = await supabase
    .from('ecos_submissions')
    .select(PUBLIC_FIELDS)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(24);
  if (error) throw error;
  return sendJson(response, 200, { ok: true, items: data || [] });
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return sendJson(response, 405, {
        ok: false,
        message: 'Use GET to list approved Ecos.'
      });
    }

    return await listApproved(request, response);
  } catch (error) {
    const message = error instanceof EcosConfigError
      ? error.message
      : 'Não foi possível carregar Ecos aprovados agora.';
    return sendJson(response, 500, {
      ok: false,
      error: 'ecos_approved_failed',
      message
    });
  }
}
