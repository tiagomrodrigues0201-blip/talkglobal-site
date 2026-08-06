function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function getBackendUrl() {
  return String(process.env.TALKGLOBAL_BACKEND_URL || '').replace(/\/+$/, '');
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return JSON.stringify(request.body);
  if (typeof request.body === 'string') return request.body;
  return await new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => resolve(raw || '{}'));
    request.on('error', reject);
  });
}

function resolveBackendPath(request, bodyText) {
  const url = new URL(request.url, 'https://talkglobalapp.com');
  const action = url.searchParams.get('action') || (() => {
    try {
      return JSON.parse(bodyText || '{}')?.action || '';
    } catch {
      return '';
    }
  })();

  if (request.method === 'GET' && action === 'catalog') return { method: 'GET', path: '/cartas/catalog' };
  if (request.method === 'GET') return { method: 'GET', path: '/cartas/me' };
  if (action === 'initial-cards') return { method: 'POST', path: '/cartas/initial-cards' };
  if (action === 'save-deck') return { method: 'POST', path: '/cartas/deck' };
  if (action === 'start-tutorial') return { method: 'POST', path: '/cartas/battle/tutorial' };

  if (action === 'battle-action') {
    try {
      const body = JSON.parse(bodyText || '{}');
      if (body.battleId) {
        return {
          method: 'POST',
          path: `/cartas/battle/${encodeURIComponent(body.battleId)}/action`,
          body: JSON.stringify({ action: body.battleAction || body.actionPayload || { type: 'attack' } })
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export default async function handler(request, response) {
  try {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      return sendJson(response, 503, {
        ok: false,
        error: 'backend_url_missing',
        message: 'Configure TALKGLOBAL_BACKEND_URL para usar o back-end oficial de cartas.'
      });
    }

    const bodyText = request.method === 'GET' ? '' : await readBody(request);
    const target = resolveBackendPath(request, bodyText);
    if (!target) return sendJson(response, 400, { ok: false, error: 'unknown_action' });

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    const authorization = request.headers.authorization || request.headers.Authorization || '';
    if (authorization) headers.set('Authorization', authorization);

    const upstream = await fetch(`${backendUrl}${target.path}`, {
      method: target.method,
      headers,
      body: target.method === 'GET' ? undefined : (target.body || bodyText)
    });

    const text = await upstream.text();
    response.statusCode = upstream.status;
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(text);
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      error: 'cards_proxy_failed',
      message: error.message || 'Erro ao encaminhar API de cartas.'
    });
  }
}
