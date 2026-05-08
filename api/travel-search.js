export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    for (const field of ['origin', 'destination']) {
      if (!body?.[field]) return response.status(400).json({ error: `${field} is required` });
    }

    // Fase 1: endpoint preparado para Vercel.
    // Quando ativar Supabase no backend, inserir em public.travel_searches usando:
    // SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
    // Não exponha service role key no navegador.
    return response.status(202).json({
      ok: true,
      mode: 'prepared',
      id: crypto.randomUUID(),
      message: 'Travel search accepted. Configure Supabase server insert for persistence.'
    });
  } catch (error) {
    return response.status(500).json({ error: 'Could not process travel search' });
  }
}
