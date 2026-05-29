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

  const supabaseUrl = process.env.HESIDIO_SUPABASE_URL || '';
  const anonKey = process.env.HESIDIO_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_HESIDIO_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !anonKey) {
    return sendJson(response, 200, {
      ok: true,
      configured: false,
      message: 'Supabase Auth das cartas ainda precisa de HESIDIO_SUPABASE_URL e HESIDIO_SUPABASE_ANON_KEY.'
    });
  }

  return sendJson(response, 200, {
    ok: true,
    configured: true,
    supabaseUrl,
    anonKey
  });
}
