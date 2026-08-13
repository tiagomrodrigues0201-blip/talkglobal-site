import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_SLUG = "freela-na-vida-real";
const PRODUCT_TITLE = "Freela na Vida Real - Ebook + Kit Prático de Execução";
const PIX_AMOUNT_CENTS = 1499;
const ALLOWED_AMOUNTS = new Set([1499, 5700]);
const DEFAULT_BUCKET = "private-products";
const DEFAULT_OBJECT = "freela/Freela_na_Vida_Real_Kit.zip";
const SIGNED_URL_TTL_SECONDS = 300;
const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

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

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const rawBody = await readRawBody(req);
  return rawBody ? JSON.parse(rawBody) : {};
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function amountToCents(value) {
  return Math.round(Number(value || 0) * 100);
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
  try { payload = await readJsonBody(req); }
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
  return json(res, 200, { url: data.url });
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

function getMercadoPagoToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || "";
}

async function getMercadoPagoPayment(paymentId) {
  const accessToken = getMercadoPagoToken();
  if (!accessToken) return { error: "missing_mercadopago_token" };
  const response = await fetch(`${MERCADOPAGO_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? { payment: data } : { error: "mercadopago_error", status: response.status };
}

function isFreelaPixPayment(payment) {
  const metadataProduct = payment?.metadata?.product;
  const reference = String(payment?.external_reference || "");
  return (
    payment?.status === "approved" &&
    payment?.payment_method_id === "pix" &&
    String(payment?.currency_id || "").toUpperCase() === "BRL" &&
    amountToCents(payment?.transaction_amount) === PIX_AMOUNT_CENTS &&
    (metadataProduct === PRODUCT_SLUG || reference.startsWith(`${PRODUCT_SLUG}:`))
  );
}

function mapPixStatus(payment) {
  if (isFreelaPixPayment(payment)) return "approved";
  if (["pending", "in_process", "authorized"].includes(payment?.status)) return "pending";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(payment?.status)) return "rejected";
  return payment?.status || "unknown";
}

function extractPixData(payment) {
  const transactionData = payment?.point_of_interaction?.transaction_data || {};
  return {
    paymentId: String(payment?.id || ""),
    status: mapPixStatus(payment),
    qrCode: transactionData.qr_code || "",
    qrCodeBase64: transactionData.qr_code_base64 || "",
    ticketUrl: transactionData.ticket_url || ""
  };
}

async function createPixPayment(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }

  let payload = {};
  try { payload = await readJsonBody(req); }
  catch { return json(res, 400, { message: "Payload inválido." }); }
  if (payload.product !== PRODUCT_SLUG) return json(res, 400, { message: "Produto inválido." });

  const email = String(payload.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) return json(res, 400, { message: "Informe um e-mail válido para gerar o Pix." });

  const accessToken = getMercadoPagoToken();
  if (!accessToken) return json(res, 503, { message: "Pix ainda não configurado." });

  const origin = getOrigin(req);
  const externalReference = `${PRODUCT_SLUG}:${crypto.randomUUID()}`;
  const body = {
    transaction_amount: PIX_AMOUNT_CENTS / 100,
    description: PRODUCT_TITLE,
    payment_method_id: "pix",
    notification_url: `${origin}/api/freela-mercadopago-webhook`,
    external_reference: externalReference,
    metadata: {
      product: PRODUCT_SLUG,
      product_version: "1.1",
      delivery: "Freela_na_Vida_Real_Kit.zip"
    },
    payer: { email }
  };

  const response = await fetch(`${MERCADOPAGO_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return json(res, response.status, { message: "Não foi possível gerar o Pix agora." });

  const pix = extractPixData(data);
  if (!pix.paymentId || !pix.qrCode || !pix.qrCodeBase64) {
    return json(res, 502, { message: "O Mercado Pago não retornou os dados completos do Pix." });
  }

  return json(res, 200, {
    payment_id: pix.paymentId,
    status: pix.status,
    qr_code: pix.qrCode,
    qr_code_base64: pix.qrCodeBase64,
    ticket_url: pix.ticketUrl,
    amount: "R$14,99"
  });
}

async function pixStatus(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { message: "Método não permitido." });
  }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const paymentId = url.searchParams.get("payment_id") || "";
  if (!/^\d+$/.test(paymentId)) return json(res, 400, { message: "Pagamento Pix inválido." });

  const result = await getMercadoPagoPayment(paymentId);
  if (result.error) return json(res, result.status || 503, { message: "Não foi possível consultar o Pix." });

  const status = mapPixStatus(result.payment);
  const approved = isFreelaPixPayment(result.payment);
  return json(res, 200, {
    status,
    approved,
    download_url: approved ? `/api/freela-download?mp_payment_id=${encodeURIComponent(paymentId)}` : undefined
  });
}

function hasValidMercadoPagoSignature(req) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  const xSignature = String(req.headers["x-signature"] || "");
  const xRequestId = String(req.headers["x-request-id"] || "");
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  const parts = xSignature.split(",").reduce((result, entry) => {
    const [key, ...value] = entry.split("=");
    if (key) result[key.trim()] = value.join("=").trim();
    return result;
  }, {});
  if (!parts.ts || !parts.v1 || !xRequestId || !dataId) return false;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

async function mercadoPagoWebhook(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }
  if (!hasValidMercadoPagoSignature(req)) return json(res, 401, { message: "Assinatura Mercado Pago inválida." });

  let payload = {};
  try { payload = await readJsonBody(req); }
  catch { return json(res, 400, { message: "Evento inválido." }); }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const eventType = payload.type || payload.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "";
  const paymentId = payload.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  if (!["payment", "merchant_order"].includes(eventType) || !/^\d+$/.test(String(paymentId))) {
    return json(res, 200, { received: true, ignored: true });
  }

  const result = await getMercadoPagoPayment(String(paymentId));
  if (result.error) return json(res, 200, { received: true, pending_validation: true });
  return json(res, 200, {
    received: true,
    fulfilled: isFreelaPixPayment(result.payment),
    payment_id: isFreelaPixPayment(result.payment) ? String(paymentId) : undefined
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
  const mercadoPagoPaymentId = url.searchParams.get("mp_payment_id") || "";
  if (sessionId) {
    if (!sessionId.startsWith("cs_")) return json(res, 400, { message: "Sessão de compra inválida." });
    const result = await getCheckoutSession(sessionId);
    if (result.error) return json(res, result.status || 503, { message: "Não foi possível confirmar o pagamento." });
    const session = result.session;
    const valid = session.metadata?.product === PRODUCT_SLUG && session.payment_status === "paid" && session.mode === "payment" && session.currency === "brl" && ALLOWED_AMOUNTS.has(session.amount_total);
    if (!valid) return json(res, 403, { message: "Pagamento não confirmado para este produto." });
  } else if (mercadoPagoPaymentId) {
    if (!/^\d+$/.test(mercadoPagoPaymentId)) return json(res, 400, { message: "Pagamento Pix inválido." });
    const result = await getMercadoPagoPayment(mercadoPagoPaymentId);
    if (result.error) return json(res, result.status || 503, { message: "Não foi possível confirmar o Pix." });
    if (!isFreelaPixPayment(result.payment)) return json(res, 403, { message: "Pagamento Pix não confirmado para este produto." });
  } else {
    return json(res, 400, { message: "Sessão de compra não encontrada." });
  }
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
  if (action === "pix") return createPixPayment(req, res);
  if (action === "pix-status") return pixStatus(req, res);
  if (action === "mercadopago-webhook") return mercadoPagoWebhook(req, res);
  if (action === "download") return download(req, res);
  return json(res, 404, { message: "Rota não encontrada." });
}
