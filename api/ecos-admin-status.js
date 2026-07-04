import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'test', 'deleted']);

class EcosConfigError extends Error {}
class EcosAuthError extends Error {}
class EcosInputError extends Error {}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
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

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function updateStatus(request, response) {
  requireAdmin(request);
  const body = await readBody(request);
  const id = String(body.id || '').trim();
  const status = String(body.status || '').trim();

  if (!id) throw new EcosInputError('ID do envio não informado.');
  if (!VALID_STATUSES.has(status)) throw new EcosInputError('Status inválido.');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ecos_submissions')
    .update({ status })
    .eq('id', id)
    .select('id,status')
    .maybeSingle();

  if (error) throw error;
  if (!data) return sendJson(response, 404, { ok: false, error: 'ecos_submission_not_found', message: 'Envio não encontrado.' });

  return sendJson(response, 200, { ok: true, item: data });
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, { ok: false, message: 'Use POST para atualizar status.' });
    }

    return await updateStatus(request, response);
  } catch (error) {
    if (error instanceof EcosAuthError) {
      return sendJson(response, 401, { ok: false, error: 'ecos_admin_unauthorized', message: error.message });
    }
    if (error instanceof EcosInputError || error instanceof SyntaxError) {
      return sendJson(response, 400, { ok: false, error: 'ecos_admin_bad_request', message: error.message || 'JSON inválido.' });
    }

    const message = error instanceof EcosConfigError
      ? error.message
      : 'Não foi possível atualizar o status agora.';
    return sendJson(response, 500, { ok: false, error: 'ecos_admin_status_failed', message });
  }
}
