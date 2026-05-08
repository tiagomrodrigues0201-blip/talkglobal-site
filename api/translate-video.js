export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Mock seguro para validação da UI. Integração real:
  // 1. autenticar usuário;
  // 2. validar plano Stripe;
  // 3. criar job no Supabase;
  // 4. gerar signed upload URL;
  // 5. enfileirar worker para OpenAI + FFmpeg.
  return response.status(202).json({
    status: 'queued',
    jobId: crypto.randomUUID(),
    message: 'Video translation job accepted for processing.',
    next: ['upload', 'transcribe', 'translate', 'render', 'export']
  });
}
