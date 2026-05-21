import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const sourceRoot = "/Users/tiago/Desktop/Anime/manga/o-acidente";
const siteRoot = "/Users/tiago/Desktop/Site";
const publicRoot = join(siteRoot, "public/manga/episodios");
const pageRoot = join(siteRoot, "manga/episodios");
const previewCount = 3;
const releasedEpisodes = new Set(
  (process.env.HESIDIO_RELEASED_EPISODES || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Boolean)
);

const titles = {
  1: "O Acidente",
  2: "A Garota que Sobreviveu",
  3: "O Peso do Viajante",
  4: "O homem que não conseguia vencer",
  5: "O despertar de um monstro",
  6: "Arquivo restrito",
  7: "Arquivo restrito",
  8: "Arquivo restrito",
  9: "Arquivo restrito",
  10: "Arquivo restrito",
  11: "Arquivo restrito",
};

const descriptions = {
  1: "O primeiro registro público de HESIDIO. Uma ruptura começa antes que alguém consiga nomeá-la.",
  2: "Registro semanal da Temporada I. Nome e descrição permanecem ocultos até a data de liberação.",
  3: "Registro semanal da Temporada I. Nome e descrição permanecem ocultos até a data de liberação.",
  4: "Registro semanal da Temporada I. Nome e descrição permanecem ocultos até a data de liberação.",
  5: "Registro semanal da Temporada I. Nome e descrição permanecem ocultos até a data de liberação.",
  6: "Os registros seguintes foram selados.",
  7: "Os registros seguintes foram selados.",
  8: "Os registros seguintes foram selados.",
  9: "Os registros seguintes foram selados.",
  10: "Os registros seguintes foram selados.",
  11: "Registro futuro. Acesso reservado para a Temporada I.",
};

const releaseDates = {
  1: "23/05/2026",
  2: "30/05/2026",
  3: "06/06/2026",
  4: "13/06/2026",
  5: "20/06/2026",
  6: "27/06/2026",
  7: "04/07/2026",
  8: "11/07/2026",
  9: "18/07/2026",
  10: "25/07/2026",
  11: "01/08/2026",
};

rmSync(publicRoot, { recursive: true, force: true });
rmSync(pageRoot, { recursive: true, force: true });
mkdirSync(publicRoot, { recursive: true });
mkdirSync(pageRoot, { recursive: true });

for (let number = 1; number <= 11; number++) {
  const slug = `ep-${number}`;
  const sourceDir = join(sourceRoot, slug, "images");
  const publicDir = join(publicRoot, slug, "images");
  const episodePageDir = join(pageRoot, slug);
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(episodePageDir, { recursive: true });

  const sourceImages = existsSync(sourceDir)
    ? readdirSync(sourceDir).filter((file) => /\.(png|jpe?g|webp)$/i.test(file)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];

  const isReleased = releasedEpisodes.has(number);
  const imagesToCopy = isReleased ? sourceImages : sourceImages.slice(0, previewCount);
  const copiedImages = [];
  for (const file of imagesToCopy) {
    const source = join(sourceDir, file);
    const outputName = isReleased ? file : file.replace(/\.(png|jpe?g|webp)$/i, ".jpg");
    const target = join(publicDir, outputName);
    if (isReleased) {
      copyFileSync(source, target);
    } else {
      writePreviewImage(source, target);
    }
    copiedImages.push(outputName);
  }

  const pageImages = copiedImages.map((file) => `/public/manga/episodios/${slug}/images/${file}`);
  const html = isReleased ? freePage(number, slug, pageImages) : lockedPage(number, slug, pageImages);
  writeFileSync(join(episodePageDir, "index.html"), html);
}

function writePreviewImage(source, target) {
  try {
    execFileSync("/usr/bin/sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", "70",
      "--resampleWidth", "1200",
      source,
      "--out", target,
    ], { stdio: "ignore" });
  } catch {
    copyFileSync(source, target);
  }
}

function head(title, description, canonical) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — HESIDIO</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="https://talkglobalapp.com${canonical}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="HESIDIO">
<meta property="og:title" content="${escapeHtml(title)} — HESIDIO">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="https://talkglobalapp.com${canonical}">
<meta property="og:image" content="https://talkglobalapp.com/public/studios/hesidio-poster.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/public/studios/hesidio-logo-site.png">
<link rel="stylesheet" href="/assets/hesidio-reader.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852370456334253" crossorigin="anonymous"></script>
</head>`;
}

function freePage(number, slug, images) {
  const title = `EP ${String(number).padStart(2, "0")} — ${titles[number]}`;
  const description = descriptions[number];
  return `${head(title, description, `/manga/episodios/${slug}/`)}
<body class="hesidio-reader-page">
  ${topbar(number)}
  <main class="reader-shell">
    <section class="reader-intro">
      <small>Registro gratuito / Temporada I</small>
      <h1>${escapeHtml(titles[number])}</h1>
      <p>${escapeHtml(description)}</p>
    </section>
    ${images.map((src, index) => `<figure class="manga-page" oncontextmenu="return false">
      <img src="${src}" alt="HESIDIO EP ${String(number).padStart(2, "0")} - página ${String(index + 1).padStart(3, "0")}" draggable="false" loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
      <span class="page-mark"><strong>HESIDIO</strong><small>@hesidio</small></span>
    </figure>`).join("\n    ")}
  </main>
  ${readerGuard()}
</body>
</html>`;
}

function lockedPage(number, slug, previews) {
  const title = `EP ${String(number).padStart(2, "0")} — Arquivo restrito`;
  const description = number >= 6
    ? "Registro premium da Temporada I. O conteúdo permanece selado no arquivo oficial de HESIDIO."
    : "Registro semanal da Temporada I. Nome, descrição e páginas completas permanecem ocultos até a data de liberação.";
  const action = number >= 6
    ? `<a class="reader-button" href="/manga/#temporada-premium">Acessar Temporada I - R$9,90</a>`
    : `<a class="reader-button" href="/manga/#episodios">Voltar ao calendário de liberação</a>`;
  return `${head(title, description, `/manga/episodios/${slug}/`)}
<body class="hesidio-reader-page">
  ${topbar(number)}
  <main class="locked-reader">
    <section class="locked-box">
      <span>ARQUIVO RESTRITO / TEMPORADA I</span>
      <h1>Os registros seguintes foram selados.</h1>
      <p>EP ${String(number).padStart(2, "0")} ainda não foi aberto. A liberação está prevista para ${releaseDates[number] || "data restrita"}. HESIDIO será liberado em ritmo semanal para preservar o mistério da Temporada I.</p>
      ${previews.length ? `<div class="preview-strip">${previews.map((src) => `<img src="${src}" alt="Prévia restrita HESIDIO" draggable="false">`).join("")}</div>` : ""}
      ${action}
    </section>
  </main>
  ${readerGuard()}
</body>
</html>`;
}

function topbar(number) {
  const prev = number > 1 ? `/manga/episodios/ep-${number - 1}/` : "/manga/";
  const next = number < 11 ? `/manga/episodios/ep-${number + 1}/` : "/manga/";
  return `<header class="reader-topbar">
    <a class="reader-brand" href="/manga/"><img src="/public/studios/hesidio-logo-site.png" alt="">HESIDIO</a>
    <nav class="reader-nav" aria-label="Navegação do leitor">
      <a href="${prev}">Anterior</a>
      <a href="/manga/#episodios">Temporada I</a>
      <a href="${next}">Próximo</a>
    </nav>
  </header>`;
}

function readerGuard() {
  return `<script>
    document.addEventListener("contextmenu", (event) => {
      if (event.target && event.target.tagName === "IMG") event.preventDefault();
    });
    document.querySelectorAll("img").forEach((img) => {
      img.draggable = false;
    });
  </script>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
