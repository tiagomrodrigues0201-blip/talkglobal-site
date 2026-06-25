import { createClient } from '@supabase/supabase-js';

const PUBLIC_FIELDS = 'id,title,author_name,creation_type,short_description,age_rating,cover_url,external_link,created_at';

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

async function listApproved(request, response) {
  const url = requestUrl(request);
  const id = String(url.searchParams.get('id') || '').trim();
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('ecos_submissions')
    .select(PUBLIC_FIELDS)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (id) {
    query = query.eq('id', id).limit(1);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return sendJson(response, 200, { ok: true, item: data || null });
  }

  const { data, error } = await query.limit(24);
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
