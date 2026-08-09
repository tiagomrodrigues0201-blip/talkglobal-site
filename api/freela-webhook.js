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

  const parts = Object.fromEntries(
    header.split(",").map((entry) => {
      const [key, ...value] = entry.split("=");
      return [key, value.join("=")];
    })
  );

  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const received = parts.v1;

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

async function recordPaidOrder(event) {
  const session = event.data?.object || {};

  if (session.metadata?.product !== PRODUCT_SLUG) {
    return { ignored: true, reason: "Produto diferente." };
  }

  if (session.payment_status !== "paid") {
    return { ignored: true, reason: "Pagamento ainda não confirmado." };
  }

  // Evolução recomendada:
  // 1. gravar order/session/customer em banco privado;
  // 2. gerar token curto, de uso único, com expiração;
  // 3. enviar e-mail com link assinado;
  // 4. liberar o arquivo por storage privado ou endpoint autenticado.
  return { recorded: true, session_id: session.id };
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

  if (event.type === "checkout.session.completed") {
    const result = await recordPaidOrder(event);
    return json(res, 200, { received: true, result });
  }

  return json(res, 200, { received: true, ignored: true });
}
