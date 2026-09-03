import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_SLUG = "freela-na-vida-real";
const ALLOWED_AMOUNTS = new Set([1499, 4700, 5700]);
const DEFAULT_BUCKET = "private-products";
const DEFAULT_OBJECT = "freela/Freela_na_Vida_Real_Kit.zip";
const SIGNED_URL_TTL_SECONDS = 300;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getAction(req) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  return url.searchParams.get("action") || "";
}

function getOrigin(req) {
  const configured = process.env.SITE_URL || process.env.VERCEL_URL;
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;
  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

function getActivePriceId() {
  const launchEndsAt = process.env.FREELA_LAUNCH_ENDS_AT;
  const launchPriceId = process.env.STRIPE_FREELA_LAUNCH_PRICE_ID || process.env.STRIPE_FREELA_PRICE_ID;
  const regularPriceId = process.env.STRIPE_FREELA_REGULAR_PRICE_ID;
  if (!launchEndsAt) return { priceId: launchPriceId, priceType: "launch" };
  const endsAt = Date.parse(launchEndsAt);
  const launchActive = Number.isFinite(endsAt) && Date.now() < endsAt;
  return launchActive
    ? { priceId: launchPriceId, priceType: "launch" }
    : { priceId: regularPriceId || launchPriceId, priceType: "regular" };
}

async function checkout(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }
  let payload = {};
  try { payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; }
  catch { return json(res, 400, { message: "Payload inválido." }); }
  if (payload.product !== PRODUCT_SLUG) return json(res, 400, { message: "Produto inválido." });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const { priceId, priceType } = getActivePriceId();
  if (!secretKey || !priceId) return json(res, 503, { message: "A compra ainda não está ativa. Estamos preparando a liberação com segurança." });

  const origin = getOrigin(req);
  const params = new URLSearchParams({
    mode: "payment",
    integration_identifier: "talkglobal_freela_qmznvrtc",
    customer_creation: "always",
    client_reference_id: PRODUCT_SLUG,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/freela-na-vida-real/obrigado/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/freela-na-vida-real/?checkout=cancelled`,
    "metadata[product]": PRODUCT_SLUG,
    "metadata[price_type]": priceType,
    "payment_intent_data[metadata][product]": PRODUCT_SLUG,
    "payment_intent_data[metadata][price_type]": priceType
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Stripe-Version": "2026-06-24.dahlia", "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await response.json();
  if (!response.ok) return json(res, response.status, { message: "Não foi possível iniciar a compra agora." });
  return json(res, 200, {
    url: data.url,
    value: Number.isInteger(data.amount_total) ? data.amount_total / 100 : 14.99,
    currency: String(data.currency || "brl").toUpperCase()
  });
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
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((received) => expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received)));
}

async function webhook(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }
  const secret = process.env.STRIPE_FREELA_WEBHOOK_SECRET;
  if (!secret) return json(res, 503, { message: "Webhook ainda não configurado." });
  const rawBody = await readRawBody(req);
  if (!hasValidStripeSignature(rawBody, req.headers["stripe-signature"], secret)) return json(res, 400, { message: "Assinatura Stripe inválida." });
  let event;
  try { event = JSON.parse(rawBody); }
  catch { return json(res, 400, { message: "Evento inválido." }); }
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const session = event.data?.object || {};
    const fulfilled = session.metadata?.product === PRODUCT_SLUG && session.payment_status === "paid";
    return json(res, 200, { received: true, fulfilled, session_id: fulfilled ? session.id : undefined });
  }
  return json(res, 200, { received: true, ignored: true });
}

async function getCheckoutSession(sessionId) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return { error: "missing_secret" };
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${secretKey}`, "Stripe-Version": "2026-06-24.dahlia" } });
  const data = await response.json();
  return response.ok ? { session: data } : { error: "stripe_error", status: response.status };
}

function isPaidFreelaSession(session) {
  return session.metadata?.product === PRODUCT_SLUG
    && session.payment_status === "paid"
    && session.mode === "payment"
    && session.currency === "brl"
    && ALLOWED_AMOUNTS.has(session.amount_total);
}

async function status(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { message: "Método não permitido." });
  }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!sessionId.startsWith("cs_")) return json(res, 400, { message: "Sessão de compra inválida." });

  const result = await getCheckoutSession(sessionId);
  if (result.error) return json(res, result.status || 503, { message: "Não foi possível confirmar o pagamento." });
  const session = result.session;
  if (!isPaidFreelaSession(session)) return json(res, 200, { paid: false });

  return json(res, 200, {
    paid: true,
    transaction_id: session.id,
    value: session.amount_total / 100,
    currency: session.currency.toUpperCase(),
    price_type: session.metadata?.price_type || ""
  });
}

async function getSignedProductUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return { error: "missing_storage_config" };
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.storage
    .from(process.env.FREELA_PRODUCT_BUCKET || DEFAULT_BUCKET)
    .createSignedUrl(process.env.FREELA_PRODUCT_OBJECT || DEFAULT_OBJECT, SIGNED_URL_TTL_SECONDS, { download: "Freela_na_Vida_Real_Kit.zip" });
  return error || !data?.signedUrl ? { error: "storage_error" } : { signedUrl: data.signedUrl };
}

async function download(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { message: "Método não permitido." });
  }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!sessionId.startsWith("cs_")) return json(res, 400, { message: "Sessão de compra inválida." });
  const result = await getCheckoutSession(sessionId);
  if (result.error) return json(res, result.status || 503, { message: "Não foi possível confirmar o pagamento." });
  const session = result.session;
  const valid = isPaidFreelaSession(session);
  if (!valid) return json(res, 403, { message: "Pagamento não confirmado para este produto." });
  const product = await getSignedProductUrl();
  if (product.error) return json(res, 503, { message: "O kit digital ainda não está disponível no armazenamento privado." });
  res.statusCode = 302;
  res.setHeader("Location", product.signedUrl);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.end();
}

export default async function handler(req, res) {
  const action = getAction(req);
  if (action === "checkout") return checkout(req, res);
  if (action === "webhook") return webhook(req, res);
  if (action === "status") return status(req, res);
  if (action === "download") return download(req, res);
  return json(res, 404, { message: "Rota não encontrada." });
}
