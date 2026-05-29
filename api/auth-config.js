function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !anonKey) {
    return sendJson(response, 200, {
      ok: true,
      configured: false,
      message: 'Supabase Auth ainda precisa de SUPABASE_URL e SUPABASE_ANON_KEY.'
    });
  }

  return sendJson(response, 200, {
    ok: true,
    configured: true,
    supabaseUrl,
    anonKey
  });
}
