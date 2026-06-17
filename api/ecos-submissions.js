import { createClient } from '@supabase/supabase-js';

const EXPECTED_COVERS_BUCKET = 'ecos-covers';
const EXPECTED_FILES_BUCKET = 'ecos-files';
const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 3;
const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FILE_TYPES = new Set(['application/pdf']);

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
    throw new EcosConfigError('Configuração de envio indisponível no momento.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getStorageBuckets() {
  const coversBucket = process.env.SUPABASE_COVERS_BUCKET;
  const filesBucket = process.env.SUPABASE_FILES_BUCKET;
  if (!coversBucket || !filesBucket) {
    throw new EcosConfigError('Configuração de envio indisponível no momento.');
  }
  if (coversBucket !== EXPECTED_COVERS_BUCKET || filesBucket !== EXPECTED_FILES_BUCKET) {
    throw new EcosConfigError('Configuração de envio indisponível no momento.');
  }
  return { coversBucket, filesBucket };
}

function cleanText(value, maxLength = 4000) {
  return String(value || '').trim().slice(0, maxLength);
}

function slugify(value) {
  return cleanText(value, 120)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'eco';
}

function extensionFromName(fileName, fallback) {
  const extension = String(fileName || '').split('.').pop();
  return extension && extension !== fileName ? extension.toLowerCase().replace(/[^a-z0-9]/g, '') : fallback;
}

function buildPath(kind, title, file, index = 0) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  const extension = extensionFromName(file?.name, kind === 'cover' ? 'jpg' : 'pdf');
  return `${slugify(title)}/${stamp}-${random}${index ? `-parte-${index + 1}` : ''}.${extension}`;
}

function getHeader(request, name) {
  return request.headers?.[name] || request.headers?.[name.toLowerCase()] || request.headers?.[name.toUpperCase()] || '';
}

async function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (request.body instanceof Uint8Array) return Buffer.from(request.body);
  if (typeof request.body === 'string') return Buffer.from(request.body);

  return await new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function parseContentDisposition(value) {
  const result = {};
  String(value || '').split(';').forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || !rawValue.length) return;
    result[rawKey.toLowerCase()] = rawValue.join('=').trim().replace(/^"|"$/g, '');
  });
  return result;
}

function parseMultipart(buffer, boundary) {
  const fields = {};
  const files = {};
  const delimiter = Buffer.from(`--${boundary}`);
  let cursor = buffer.indexOf(delimiter);

  while (cursor !== -1) {
    cursor += delimiter.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;

    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), cursor);
    if (headerEnd === -1) break;
    const headerText = buffer.slice(cursor, headerEnd).toString('utf8');
    const headers = {};
    headerText.split('\r\n').forEach((line) => {
      const index = line.indexOf(':');
      if (index === -1) return;
      headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
    });

    const nextBoundary = buffer.indexOf(delimiter, headerEnd + 4);
    if (nextBoundary === -1) break;
    let content = buffer.slice(headerEnd + 4, nextBoundary);
    if (content.length >= 2 && content[content.length - 2] === 13 && content[content.length - 1] === 10) {
      content = content.slice(0, -2);
    }

    const disposition = parseContentDisposition(headers['content-disposition']);
    const name = disposition.name;
    if (name) {
      if (disposition.filename) {
        const file = {
          name: disposition.filename,
          type: headers['content-type'] || 'application/octet-stream',
          size: content.length,
          buffer: content
        };
        files[name] = files[name] || [];
        files[name].push(file);
      } else {
        fields[name] = content.toString('utf8');
      }
    }
    cursor = nextBoundary;
  }

  return { fields, files };
}

async function readSubmission(request) {
  const contentType = getHeader(request, 'content-type');
  const boundary = String(contentType).match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] || String(contentType).match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if (!boundary) throw new PublicSubmissionError('Envio inválido: formulário multipart obrigatório.');

  const rawBody = await readRawBody(request);
  const { fields, files } = parseMultipart(rawBody, boundary);
  return {
    metadata: {
      title: fields.title,
      author_name: fields.author_name || fields.penName,
      author_email: fields.author_email || fields.email,
      social_url: fields.social_url || fields.social,
      creation_type: fields.creation_type || fields.creationType,
      short_description: fields.short_description || fields.summary,
      content_text: fields.content_text || fields.contentText,
      external_link: fields.external_link || fields.externalLink,
      age_rating: fields.age_rating || fields.rating
    },
    cover: files.cover?.[0] || files.coverImage?.[0] || null,
    files: files.files || files.workPdf || []
  };
}

function validateMetadata(body) {
  const metadata = body.metadata || {};
  const required = {
    title: cleanText(metadata.title, 180),
    author_name: cleanText(metadata.author_name, 140),
    author_email: cleanText(metadata.author_email, 180),
    creation_type: cleanText(metadata.creation_type, 80),
    short_description: cleanText(metadata.short_description, 700),
    age_rating: cleanText(metadata.age_rating, 20)
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) throw new PublicSubmissionError('Preencha todos os campos obrigatórios antes de enviar.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(required.author_email)) {
    throw new PublicSubmissionError('E-mail inválido.');
  }

  return {
    ...required,
    social_url: cleanText(metadata.social_url, 500) || null,
    content_text: cleanText(metadata.content_text, 20000) || null,
    external_link: cleanText(metadata.external_link, 1000) || null
  };
}

function validateCover(file) {
  if (!file) throw new PublicSubmissionError('Imagem de capa obrigatória.');
  if (!ALLOWED_COVER_TYPES.has(file.type)) throw new PublicSubmissionError('A capa deve estar em JPG, PNG ou WEBP.');
  if (Number(file.size || 0) > MAX_COVER_SIZE) throw new PublicSubmissionError('A capa pode ter até 10 MB.');
}

function validateFiles(files) {
  if (!Array.isArray(files)) throw new PublicSubmissionError('Lista de arquivos inválida.');
  if (files.length > MAX_FILES) throw new PublicSubmissionError('Envie no máximo 3 arquivos da obra.');
  files.forEach((file) => {
    if (!ALLOWED_FILE_TYPES.has(file.type)) throw new PublicSubmissionError('Os arquivos anexos devem estar em PDF.');
    if (Number(file.size || 0) > MAX_FILE_SIZE) throw new PublicSubmissionError('Cada arquivo da obra pode ter até 50 MB.');
  });
}

async function uploadFile(supabase, bucket, path, file) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file.buffer, {
      contentType: file.type,
      upsert: false
    });
  if (error) throw error;
}

async function createSubmission(request, response) {
  const { metadata: rawMetadata, cover, files } = await readSubmission(request);
  const metadata = validateMetadata({ metadata: rawMetadata });
  validateCover(cover);
  validateFiles(files);

  const supabase = getSupabaseAdmin();
  const { coversBucket, filesBucket } = getStorageBuckets();
  const coverPath = buildPath('cover', metadata.title, cover);
  const fileUrls = [];

  await uploadFile(supabase, coversBucket, coverPath, cover);

  for (const [index, file] of files.entries()) {
    const path = buildPath('file', metadata.title, file, index);
    await uploadFile(supabase, filesBucket, path, file);
    fileUrls.push(`${filesBucket}/${path}`);
  }

  const { data: publicCover } = supabase.storage.from(coversBucket).getPublicUrl(coverPath);
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
