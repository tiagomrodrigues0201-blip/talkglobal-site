import crypto from "node:crypto";

const PRODUCT_SLUG = "freela-na-vida-real";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function hasValidStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;

  const parts = header.split(",").reduce((result, entry) => {
    const [key, ...value] = entry.split("=");
    if (!result[key]) result[key] = [];
    result[key].push(value.join("="));
    return result;
  }, {});

  const timestamp = Number(parts.t?.[0]);
  const signatures = parts.v1 || [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return signatures.some((received) => (
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  ));
}

async function recordPaidOrder(event) {
  const session = event.data?.object || {};

  if (session.metadata?.product !== PRODUCT_SLUG) {
    return { ignored: true, reason: "Produto diferente." };
  }

  if (session.payment_status !== "paid") {
    return { ignored: true, reason: "Pagamento ainda não confirmado." };
  }

  return { fulfilled: true, session_id: session.id };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }

  const webhookSecret = process.env.STRIPE_FREELA_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return json(res, 503, { message: "Webhook em modo revisão: configure STRIPE_FREELA_WEBHOOK_SECRET." });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"];

  if (!hasValidStripeSignature(rawBody, signature, webhookSecret)) {
    return json(res, 400, { message: "Assinatura Stripe inválida." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(res, 400, { message: "Evento inválido." });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const result = await recordPaidOrder(event);
    return json(res, 200, { received: true, result });
  }

  if (event.type === "checkout.session.async_payment_failed") {
    return json(res, 200, { received: true, ignored: true, reason: "Pagamento assíncrono não confirmado." });
  }

  return json(res, 200, { received: true, ignored: true });
}
