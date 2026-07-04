import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const LIST_FIELDS = 'id,title,author_name,creation_type,short_description,age_rating,status,created_at';

class EcosConfigError extends Error {}
class EcosAuthError extends Error {}

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

async function listPending(request, response) {
  requireAdmin(request);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ecos_submissions')
    .select(LIST_FIELDS)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return sendJson(response, 200, { ok: true, items: data || [] });
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return sendJson(response, 405, { ok: false, message: 'Use GET para listar envios pendentes.' });
    }

    return await listPending(request, response);
  } catch (error) {
    if (error instanceof EcosAuthError) {
      return sendJson(response, 401, { ok: false, error: 'ecos_admin_unauthorized', message: error.message });
    }

    const message = error instanceof EcosConfigError
      ? error.message
      : 'Não foi possível carregar envios pendentes agora.';
    return sendJson(response, 500, { ok: false, error: 'ecos_admin_submissions_failed', message });
  }
}
