import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { updateSitemap } from "./updateSitemap.js";
import { upsertPosts } from "./updatePosts.js";

const APPROVAL_PATH = "automation/approval.json";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return args;
}

function readApproval() {
  if (!existsSync(APPROVAL_PATH)) {
    throw new Error("approval.json não encontrado. Rode npm run generate primeiro.");
  }
  return JSON.parse(readFileSync(APPROVAL_PATH, "utf8"));
}

function writeApproval(approval) {
  writeFileSync(APPROVAL_PATH, `${JSON.stringify(approval, null, 2)}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Comando falhou: ${command} ${args.join(" ")}`);
  }
}

function approveOnly() {
  const approval = readApproval();
  if (approval.status === "published") {
    throw new Error("Este lote já foi publicado.");
  }
  approval.status = "approved";
  approval.approvedAt = new Date().toISOString();
  writeApproval(approval);
  console.log("approval.json alterado para approved.");
}

function publish() {
  const approval = readApproval();
  if (approval.status !== "approved") {
    throw new Error(`Publicação bloqueada. Status atual: ${approval.status}. Rode npm run approve depois de revisar o email.`);
  }
  if (!Array.isArray(approval.articles) || approval.articles.length === 0) {
    throw new Error("approval.json não contém artigos.");
  }

  mkdirSync("automation/generated", { recursive: true });

  for (const article of approval.articles) {
    const markdownPath = join("automation/generated", `${article.slug}.md`);
    writeFileSync(markdownPath, article.markdown);

    run("node", [
      "scripts/create-article.mjs",
      "--title", article.title,
      "--category", article.category,
      "--description", article.description,
      "--slug", article.slug,
      "--theme", article.theme || "remote",
      "--read", article.read || "5 min",
      "--source", markdownPath,
    ]);
  }

  upsertPosts(approval.articles.map((article) => ({
    titulo: article.title,
    categoria: article.category,
    descricao: article.description,
    link: `/blog/${article.filename}`,
    tempo: article.read || "5 min",
  })));
  updateSitemap();

  approval.status = "published";
  approval.publishedAt = new Date().toISOString();
  writeApproval(approval);

  run("git", ["add", "."]);
  const titles = approval.articles.map((article) => article.title).join(" / ");
  run("git", ["commit", "-m", `Publish TalkGlobal articles: ${titles}`]);
  run("git", ["push", "origin", "main"]);

  console.log("Artigos publicados, commit criado e push enviado para origin/main.");
}

const args = parseArgs(process.argv.slice(2));

try {
  if (args["approve-only"]) {
    approveOnly();
  } else {
    publish();
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
