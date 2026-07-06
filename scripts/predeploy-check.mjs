import { existsSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  "index.html",
  "manga/index.html",
  "artigos/index.html",
  "ecos/index.html",
  "ecos/enviar/index.html",
  "sitemap.xml",
  "robots.txt",
  "ads.txt",
  "privacy.html",
  "terms.html",
  "contato.html",
  "politica-editorial.html",
  "copyright.html",
  "vercel.json",
  "package.json",
];

const requiredDirs = [
  "api",
  "assets",
  "blog",
  "manga/episodios",
  "public/manga",
  "public/artigos/covers",
];

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function isInsideTempDir(pathname) {
  const normalized = resolve(pathname);
  const tempPrefixes = [
    "/tmp",
    "/private/tmp",
    "/var/folders",
  ].map((item) => `${resolve(item)}${sep}`);

  return tempPrefixes.some((prefix) => `${normalized}${sep}`.startsWith(prefix));
}

function fail(message) {
  errors.push(`- ${message}`);
}

if (isInsideTempDir(root) && process.env.ALLOW_TEMP_DEPLOY !== "1") {
  fail("Deploy bloqueado em pasta temporaria. Use o checkout oficial completo do repositorio.");
}

const sparseCheckout = runGit(["config", "--bool", "core.sparseCheckout"]);
const sparseCheckoutCone = runGit(["config", "--bool", "core.sparseCheckoutCone"]);
if (sparseCheckout === "true" || sparseCheckoutCone === "true") {
  fail("Deploy bloqueado com sparse-checkout ativo. Rode em um checkout completo antes de publicar.");
}

const insideWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);
if (insideWorkTree !== "true") {
  fail("Deploy bloqueado fora de um repositorio Git.");
}

const uncommitted = runGit(["status", "--porcelain"]);
if (uncommitted) {
  fail("Deploy bloqueado com alteracoes locais nao commitadas. Publique apenas commits reproduziveis.");
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    fail(`Arquivo obrigatorio ausente: ${file}`);
  }
}

for (const dir of requiredDirs) {
  if (!existsSync(resolve(root, dir))) {
    fail(`Diretorio obrigatorio ausente: ${dir}`);
  }
}

for (const file of requiredFiles) {
  const parent = dirname(file);
  if (parent !== "." && !existsSync(resolve(root, parent))) {
    continue;
  }
}

if (errors.length) {
  console.error("\nPRE-DEPLOY BLOQUEADO\n");
  console.error(errors.join("\n"));
  console.error("\nNada foi publicado. Corrija o checkout/processo e rode novamente.\n");
  process.exit(1);
}

console.log("Pre-deploy OK: checkout completo, limpo e com arquivos criticos presentes.");
