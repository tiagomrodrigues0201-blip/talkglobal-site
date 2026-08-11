import { createClient } from "@supabase/supabase-js";

const PRODUCT_SLUG = "freela-na-vida-real";
const ALLOWED_AMOUNTS = new Set([1499, 5700]);
const DEFAULT_BUCKET = "private-products";
const DEFAULT_OBJECT = "freela/Freela_na_Vida_Real_Kit.zip";
const SIGNED_URL_TTL_SECONDS = 300;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getSessionId(req) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  return url.searchParams.get("session_id") || "";
}

async function getCheckoutSession(sessionId) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return { error: "missing_secret" };
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2026-06-24.dahlia"
    }
  });
  const data = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return { error: "stripe_error", status: stripeResponse.status, data };
  }

  return { session: data };
}

async function getSignedProductUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.FREELA_PRODUCT_BUCKET || DEFAULT_BUCKET;
  const objectPath = process.env.FREELA_PRODUCT_OBJECT || DEFAULT_OBJECT;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "missing_storage_config" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS, {
      download: "Freela_na_Vida_Real_Kit.zip"
    });

  if (error || !data?.signedUrl) {
    return { error: "storage_error" };
  }

  return { signedUrl: data.signedUrl };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { message: "Método não permitido." });
  }

  const sessionId = getSessionId(req);
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return json(res, 400, { message: "Sessão de compra inválida." });
  }

  const { session, error, status, data } = await getCheckoutSession(sessionId);
  if (error) {
    const message = error === "missing_secret"
      ? "Entrega ainda não ativa. Configure STRIPE_SECRET_KEY no servidor."
      : "Não foi possível confirmar o pagamento.";
    return json(res, status || 503, { message });
  }

  const validPaidSession = (
    session.metadata?.product === PRODUCT_SLUG &&
    session.payment_status === "paid" &&
    session.mode === "payment" &&
    session.currency === "brl" &&
    ALLOWED_AMOUNTS.has(session.amount_total)
  );

  if (!validPaidSession) {
    return json(res, 403, { message: "Pagamento não confirmado para este produto." });
  }

  const { signedUrl, error: storageError } = await getSignedProductUrl();
  if (storageError) {
    const message = storageError === "missing_storage_config"
      ? "Entrega ainda não configurada no servidor."
      : "O kit digital não está disponível no armazenamento privado.";
    return json(res, 503, { message });
  }

  res.statusCode = 302;
  res.setHeader("Location", signedUrl);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.end();
}
