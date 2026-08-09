import { createReadStream, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PRODUCT_SLUG = "freela-na-vida-real";
const FILE_NAME = "Freela_na_Vida_Real.pdf";
const ALLOWED_AMOUNTS = new Set([1499, 5700]);

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
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return { error: "stripe_error", status: stripeResponse.status, data };
  }

  return { session: data };
}

function getPrivateFilePath() {
  const apiDir = dirname(fileURLToPath(import.meta.url));
  return resolve(apiDir, "..", "private-products", "freela", FILE_NAME);
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

  const filePath = getPrivateFilePath();
  let fileStat;
  try {
    fileStat = statSync(filePath);
  } catch {
    return json(res, 500, { message: "Arquivo digital não encontrado no servidor." });
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", String(fileStat.size));
  res.setHeader("Content-Disposition", `attachment; filename="${FILE_NAME}"`);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  createReadStream(filePath).pipe(res);
}
