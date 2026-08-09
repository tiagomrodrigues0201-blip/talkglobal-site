const PRODUCT_SLUG = "freela-na-vida-real";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getOrigin(req) {
  const configured = process.env.SITE_URL || process.env.VERCEL_URL;
  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

function getActivePriceId() {
  const launchEndsAt = process.env.FREELA_LAUNCH_ENDS_AT;
  const launchPriceId = process.env.STRIPE_FREELA_LAUNCH_PRICE_ID || process.env.STRIPE_FREELA_PRICE_ID;
  const regularPriceId = process.env.STRIPE_FREELA_REGULAR_PRICE_ID;

  if (!launchEndsAt) {
    return { priceId: launchPriceId, priceType: "launch" };
  }

  const endsAt = Date.parse(launchEndsAt);
  const launchActive = Number.isFinite(endsAt) && Date.now() < endsAt;

  if (launchActive) {
    return { priceId: launchPriceId, priceType: "launch" };
  }

  return { priceId: regularPriceId || launchPriceId, priceType: "regular" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }

  let payload = {};
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return json(res, 400, { message: "Payload inválido." });
  }

  if (payload.product !== PRODUCT_SLUG) {
    return json(res, 400, { message: "Produto inválido." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const { priceId, priceType } = getActivePriceId();

  if (!secretKey || !priceId) {
    return json(res, 503, {
      message: "A compra ainda não está ativa. Estamos preparando a liberação com segurança."
    });
  }

  const origin = getOrigin(req);
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/freela-na-vida-real/obrigado/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/freela-na-vida-real/?checkout=cancelled`,
    "metadata[product]": PRODUCT_SLUG,
    "metadata[price_type]": priceType,
    "payment_intent_data[metadata][product]": PRODUCT_SLUG,
    "payment_intent_data[metadata][price_type]": priceType
  });

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const data = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return json(res, stripeResponse.status, {
      message: "Não foi possível iniciar a compra agora.",
      stripe_error: data.error?.message || "Erro Stripe sem mensagem."
    });
  }

  return json(res, 200, { url: data.url });
}
