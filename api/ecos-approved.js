import { createClient } from '@supabase/supabase-js';

const FILES_BUCKET = 'ecos-files';
const PAGES_BUCKET = 'ecos-pages';
const SIGNED_READ_EXPIRES_IN = 10 * 60;
const SIGNED_PAGE_EXPIRES_IN = 10 * 60;
const PUBLIC_FIELDS = 'id,title,author_name,creation_type,short_description,age_rating,cover_url,external_link,created_at';
const DETAIL_FIELDS = `${PUBLIC_FIELDS},file_url,reader_pages`;

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

function publicItem(row, chapters = [], readerPages = []) {
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
    chapters: Array.isArray(chapters) ? chapters : [],
    chapters_expires_in: chapters?.length ? SIGNED_READ_EXPIRES_IN : null,
    signed_read_url: chapters?.[0]?.url || null,
    read_url_expires_in: chapters?.length ? SIGNED_READ_EXPIRES_IN : null,
    reader_pages: Array.isArray(readerPages) ? readerPages : [],
    reader_pages_expires_in: readerPages?.length ? SIGNED_PAGE_EXPIRES_IN : null
  };
}

function parseStoredFiles(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [value];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed) return [];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function parseReaderPages(value) {
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
    ? value.path || value.file_url || value.url || value.href || value.publicUrl || value.public_url
    : value;
  const raw = String(candidate || '').trim();
  if (!raw) return '';

  let storagePath = raw;
  try {
    storagePath = new URL(raw).pathname;
  } catch {}

  let decodedPath = storagePath;
  try {
    decodedPath = decodeURIComponent(storagePath);
  } catch {}

  const withoutLeadingSlash = decodedPath.replace(/^\/+/, '');
  const withoutObjectPrefix = withoutLeadingSlash.replace(/^storage\/v1\/object\/(?:public|sign|authenticated)\//, '');
  const withoutBucket = withoutObjectPrefix.startsWith(`${FILES_BUCKET}/`)
    ? withoutObjectPrefix.slice(`${FILES_BUCKET}/`.length)
    : withoutObjectPrefix;
  const cleanPath = withoutBucket.replace(/^\/+/, '');

  if (!/^submissions\/[0-9a-f-]{36}\/[a-z0-9-]+\.(?:pdf|jpg|jpeg|png|webp)$/i.test(cleanPath)) {
    return '';
  }

  return cleanPath;
}

function normalizePagePath(value) {
  const candidate = value && typeof value === 'object'
    ? value.path || value.page_path || value.url || value.href
    : value;
  const raw = String(candidate || '').trim();
  if (!raw) return '';

  let storagePath = raw;
  try {
    storagePath = new URL(raw).pathname;
  } catch {}

  let decodedPath = storagePath;
  try {
    decodedPath = decodeURIComponent(storagePath);
  } catch {}
  const withoutPublicPrefix = decodedPath.replace(/^\/?storage\/v1\/object\/(?:public|sign|authenticated)\//, '');
  const withoutBucket = withoutPublicPrefix.startsWith(`${PAGES_BUCKET}/`)
    ? withoutPublicPrefix.slice(`${PAGES_BUCKET}/`.length)
    : withoutPublicPrefix;
  const cleanPath = withoutBucket.replace(/^\/+/, '');

  if (!/^submissions\/[0-9a-f-]{36}\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/i.test(cleanPath)) {
    return '';
  }

  return cleanPath;
}

function chapterTitle(value, index) {
  const raw = value && typeof value === 'object'
    ? value.title || value.name || value.label
    : '';
  const title = String(raw || '').trim();
  return title || `Capítulo ${index + 1}`;
}

function chapterNumber(value, index) {
  const number = value && typeof value === 'object'
    ? Number(value.chapter_number || value.chapterNumber || value.number || value.index)
    : NaN;
  return Number.isFinite(number) && number > 0 ? Math.round(number) : index + 1;
}

function pageDimensions(value) {
  if (!value || typeof value !== 'object') return {};
  const width = Number(value.width);
  const height = Number(value.height);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : null
  };
}

async function signedChapters(supabase, fileUrl) {
  const files = parseStoredFiles(fileUrl);
  const chapters = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const path = normalizePrivateFilePath(file);
    if (!path) continue;

    const { data, error } = await supabase
      .storage
      .from(FILES_BUCKET)
      .createSignedUrl(path, SIGNED_READ_EXPIRES_IN);

    if (error) {
      console.warn('[ecos-approved] chapter signed URL unavailable', {
        index: index + 1,
        message: error.message
      });
      continue;
    }

    chapters.push({
      title: chapterTitle(file, index),
      number: chapterNumber(file, index),
      type: typeof file === 'object' ? String(file.type || '').trim() || null : null,
      size: typeof file === 'object' && Number.isFinite(Number(file.size)) ? Number(file.size) : null,
      url: data?.signedUrl || ''
    });
  }

  return chapters
    .filter((chapter) => chapter.url)
    .sort((a, b) => a.number - b.number);
}

async function signedReaderPages(supabase, readerPages) {
  const pages = parseReaderPages(readerPages);
  const signedPages = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const path = normalizePagePath(page);
    if (!path) continue;

    const { data, error } = await supabase
      .storage
      .from(PAGES_BUCKET)
      .createSignedUrl(path, SIGNED_PAGE_EXPIRES_IN);

    if (error) {
      console.warn('[ecos-approved] reader page URL unavailable', {
        index: index + 1,
        message: error.message
      });
      continue;
    }

    signedPages.push({
      url: data?.signedUrl || '',
      width: pageDimensions(page).width,
      height: pageDimensions(page).height,
      index: index + 1
    });
  }

  return signedPages.filter((page) => page.url);
}

function isMissingOptionalColumn(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42703' || message.includes('reader_pages') || message.includes('file_url');
}

function isMissingColumn(error, column) {
  const message = String(error?.message || '').toLowerCase();
  return (error?.code === '42703' || message.includes('could not find') || message.includes('column')) && message.includes(column);
}

async function approvedDetail(supabase, id) {
  const withReader = await supabase
    .from('ecos_submissions')
    .select(DETAIL_FIELDS)
    .eq('status', 'approved')
    .eq('id', id)
    .maybeSingle();

  if (!withReader.error) return withReader;
  if (isMissingColumn(withReader.error, 'reader_pages')) {
    console.warn('[ecos-approved] reader_pages column unavailable; returning detail with chapter files');
    const withFiles = await supabase
      .from('ecos_submissions')
      .select(`${PUBLIC_FIELDS},file_url`)
      .eq('status', 'approved')
      .eq('id', id)
      .maybeSingle();

    if (!withFiles.error || !isMissingOptionalColumn(withFiles.error)) return withFiles;
  } else if (!isMissingOptionalColumn(withReader.error)) {
    return withReader;
  }

  console.warn('[ecos-approved] optional reader column unavailable; returning detail with public fields only');
  return supabase
    .from('ecos_submissions')
    .select(PUBLIC_FIELDS)
    .eq('status', 'approved')
    .eq('id', id)
    .maybeSingle();
}

async function listApproved(request, response) {
  const url = requestUrl(request);
  const id = String(url.searchParams.get('id') || '').trim();
  const supabase = getSupabaseAdmin();
  if (id) {
    const { data, error } = await approvedDetail(supabase, id);
    if (error) throw error;
    const chapters = data ? await signedChapters(supabase, data.file_url) : [];
    const readerPages = data ? await signedReaderPages(supabase, data.reader_pages) : [];
    return sendJson(response, 200, { ok: true, item: publicItem(data, chapters, readerPages) });
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
