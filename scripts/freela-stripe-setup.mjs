import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PRODUCT_SLUG = "freela-na-vida-real";
const PRODUCT_NAME = "Freela na Vida Real";
const LAUNCH_PRICE_CENTS = 1499;
const REQUIRED_SITE_URL = "https://talkglobalapp.com";

const envTargets = new Set(["development", "preview", "production"]);

function parseArgs(argv) {
  const args = {
    environment: "development",
    syncVercel: false,
    productionApproved: false,
    syncSecretKey: false,
    envFile: "",
    launchEndsAt: "",
    webhookUrl: "",
    regularPriceCents: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--environment") {
      args.environment = next;
      index += 1;
    } else if (arg === "--sync-vercel") {
      args.syncVercel = true;
    } else if (arg === "--production-approved") {
      args.productionApproved = true;
    } else if (arg === "--sync-secret-key") {
      args.syncSecretKey = true;
    } else if (arg === "--env-file") {
      args.envFile = next;
      index += 1;
    } else if (arg === "--launch-ends-at") {
      args.launchEndsAt = next;
      index += 1;
    } else if (arg === "--webhook-url") {
      args.webhookUrl = next;
      index += 1;
    } else if (arg === "--regular-price-cents") {
      args.regularPriceCents = Number(next);
      index += 1;
    }
  }

  if (!envTargets.has(args.environment)) {
    throw new Error("Use --environment development, preview ou production.");
  }

  return args;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) return;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  });
  return values;
}

function loadLocalEnv() {
  const cwd = process.cwd();
  if (process.argv.includes("--env-file")) {
    const envFileIndex = process.argv.indexOf("--env-file");
    const explicitFile = process.argv[envFileIndex + 1];
    return { ...readEnvFile(path.resolve(cwd, explicitFile)), ...process.env };
  }
  const envLocal = readEnvFile(path.join(cwd, ".env.local"));
  const env = readEnvFile(path.join(cwd, ".env"));
  return { ...env, ...envLocal, ...process.env };
}

function stripeMode(secretKey) {
  if (secretKey?.startsWith("sk_test_")) return "test";
  if (secretKey?.startsWith("sk_live_")) return "live";
  return "unknown";
}

function validateLaunchEndsAt(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error("FREELA_LAUNCH_ENDS_AT precisa estar em formato ISO, por exemplo 2026-08-31T23:59:59-03:00.");
  }
  return value;
}

function formBody(params) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => body.append(key, item));
    } else if (value !== undefined && value !== null && value !== "") {
      body.append(key, String(value));
    }
  });
  return body;
}

async function stripeFetch(secretKey, endpoint, options = {}) {
  const response = await fetch(`https://api.stripe.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Erro Stripe ${response.status}.`);
  }
  return data;
}

async function getOrCreateProduct(secretKey) {
  const query = encodeURIComponent(`metadata['product_slug']:'${PRODUCT_SLUG}'`);
  const search = await stripeFetch(secretKey, `/v1/products/search?query=${query}&limit=1`);
  if (search.data?.[0]) return { product: search.data[0], created: false };

  const product = await stripeFetch(secretKey, "/v1/products", {
    method: "POST",
    body: formBody({
      name: PRODUCT_NAME,
      description: "Ebook + kit prático para começar no freela com mais clareza.",
      "metadata[product_slug]": PRODUCT_SLUG
    })
  });
  return { product, created: true };
}

async function getOrCreatePrice(secretKey, productId, cents, priceType) {
  const prices = await stripeFetch(secretKey, `/v1/prices?product=${encodeURIComponent(productId)}&active=true&limit=100`);
  const existing = prices.data.find((price) => (
    price.currency === "brl" &&
    price.unit_amount === cents &&
    price.type === "one_time" &&
    price.metadata?.price_type === priceType
  ));

  if (existing) return { price: existing, created: false };

  const price = await stripeFetch(secretKey, "/v1/prices", {
    method: "POST",
    body: formBody({
      product: productId,
      currency: "brl",
      unit_amount: cents,
      "metadata[product_slug]": PRODUCT_SLUG,
      "metadata[price_type]": priceType
    })
  });
  return { price, created: true };
}

async function getOrCreateWebhook(secretKey, webhookUrl) {
  if (!webhookUrl) return { skipped: true };

  const endpoints = await stripeFetch(secretKey, "/v1/webhook_endpoints?limit=100");
  const existing = endpoints.data.find((endpoint) => endpoint.url === webhookUrl && endpoint.status === "enabled");
  if (existing) return { endpoint: existing, created: false, secret: "" };

  const endpoint = await stripeFetch(secretKey, "/v1/webhook_endpoints", {
    method: "POST",
    body: formBody({
      url: webhookUrl,
      "enabled_events[]": [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed"
      ],
      "metadata[product_slug]": PRODUCT_SLUG
    })
  });

  return { endpoint, created: true, secret: endpoint.secret };
}

function runVercelEnvAdd(name, value, environment, { sensitive = true } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["vercel", "env", "add", name, environment, "--force"];
    args.push(sensitive ? "--sensitive" : "--no-sensitive");
    const child = spawn("npx", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env
    });

    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { errorOutput += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ name, environment, stored: true });
      } else {
        const redacted = (errorOutput || output).replaceAll(value, "[hidden]");
        reject(new Error(`Falha ao gravar ${name} na Vercel: ${redacted}`));
      }
    });

    child.stdin.end(`${value}\n`);
  });
}

async function syncVercelEnv(vars, environment) {
  const stored = [];
  for (const [name, config] of Object.entries(vars)) {
    if (!config.value) continue;
    const result = await runVercelEnvAdd(name, config.value, environment, { sensitive: config.sensitive });
    stored.push(result.name);
  }
  return stored;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadLocalEnv();
  const secretKey = env.STRIPE_SECRET_KEY;
  const mode = stripeMode(secretKey);
  const launchEndsAt = validateLaunchEndsAt(args.launchEndsAt || env.FREELA_LAUNCH_ENDS_AT || "");

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não encontrada. Use Vercel Marketplace, Vercel env pull ou Stripe CLI para autenticar primeiro.");
  }

  if (args.environment !== "production" && mode !== "test") {
    throw new Error("Development e preview exigem STRIPE_SECRET_KEY de teste. Não use chave live fora de produção.");
  }

  if (args.environment === "production" && !args.productionApproved) {
    throw new Error("Produção bloqueada. Rode somente depois de aprovação explícita e com --production-approved.");
  }

  if (args.environment === "production" && mode !== "live") {
    throw new Error("Production exige STRIPE_SECRET_KEY live.");
  }

  if (args.regularPriceCents !== null && (!Number.isInteger(args.regularPriceCents) || args.regularPriceCents < 100)) {
    throw new Error("Use --regular-price-cents com valor inteiro em centavos.");
  }

  const productResult = await getOrCreateProduct(secretKey);
  const launchResult = await getOrCreatePrice(secretKey, productResult.product.id, LAUNCH_PRICE_CENTS, "launch");
  const regularResult = args.regularPriceCents === null
    ? { skipped: true }
    : await getOrCreatePrice(secretKey, productResult.product.id, args.regularPriceCents, "regular");
  const webhookResult = await getOrCreateWebhook(secretKey, args.webhookUrl);

  const vars = {
    STRIPE_SECRET_KEY: { value: args.syncSecretKey ? secretKey : "", sensitive: true },
    SITE_URL: { value: REQUIRED_SITE_URL, sensitive: false },
    STRIPE_FREELA_LAUNCH_PRICE_ID: { value: launchResult.price.id, sensitive: false },
    STRIPE_FREELA_REGULAR_PRICE_ID: { value: regularResult.price?.id || "", sensitive: false },
    STRIPE_FREELA_WEBHOOK_SECRET: { value: webhookResult.secret || "", sensitive: true },
    FREELA_LAUNCH_ENDS_AT: { value: launchEndsAt || "", sensitive: false }
  };

  const vercelStored = args.syncVercel
    ? await syncVercelEnv(vars, args.environment)
    : [];

  console.log(JSON.stringify({
    environment: args.environment,
    stripeMode: mode,
    product: { configured: true, created: productResult.created },
    launchPrice: { configured: true, amount: LAUNCH_PRICE_CENTS, created: launchResult.created },
    regularPrice: regularResult.skipped
      ? { skipped: true, reason: "valor regular não confirmado" }
      : { configured: true, amount: args.regularPriceCents, created: regularResult.created },
    webhook: webhookResult.skipped
      ? { skipped: true, reason: "informe --webhook-url quando houver URL de preview/produção definida" }
      : { configured: true, url: webhookResult.endpoint.url, created: webhookResult.created, secretStored: Boolean(webhookResult.secret) },
    vercel: args.syncVercel
      ? { synced: true, environment: args.environment, variablesStored: vercelStored }
      : { synced: false, reason: "rode com --sync-vercel depois de fazer login no Vercel CLI" },
    secretsPrinted: false
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message, secretsPrinted: false }, null, 2));
  process.exitCode = 1;
});
