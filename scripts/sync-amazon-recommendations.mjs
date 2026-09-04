import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const checkOnly = process.argv.includes("--check");
const scriptTag = '  <script type="module" src="/assets/amazon-recommendations.js"></script>';
const files = [
  ...readdirSync("artigos", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join("artigos", entry.name, "index.html")),
  ...readdirSync("blog", { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && entry.name !== "index.html")
    .map((entry) => join("blog", entry.name)),
];

const eligible = [];
const missing = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const isIndexable = /<meta name="robots" content="index,follow/i.test(source);
  const hasArticleBody = /class="[^"]*(?:article-body|simple-article__body)/.test(source);
  if (!isIndexable || !hasArticleBody) continue;

  eligible.push(file);
  if (source.includes('/assets/amazon-recommendations.js')) continue;
  missing.push(file);

  if (!checkOnly) {
    writeFileSync(file, source.replace("</body>", `${scriptTag}\n</body>`));
  }
}

if (checkOnly && missing.length) {
  console.error(`Amazon: componente ausente em ${missing.length} artigo(s).`);
  process.exit(1);
}

console.log(`Amazon: ${eligible.length} artigo(s) elegíveis; ${checkOnly ? "verificação concluída" : `${missing.length} atualizado(s)`}.`);
