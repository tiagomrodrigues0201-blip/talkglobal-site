import fs from "fs";
import path from "path";

const root = process.cwd();

const released = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const titles = {
  1: "O Acidente",
  2: "A Garota que Sobreviveu",
  3: "Registro 03",
  4: "Registro 04",
  5: "Registro 05",
  6: "Registro 06",
  7: "Registro 07",
  8: "Registro 08",
  9: "Registro 09",
  10: "Registro 10",
  11: "Registro Selado",
  12: "Registro Selado"
};

const questions = {
  1: "O que mais chamou sua atenção neste primeiro registro?",
  2: "Qual personagem despertou mais curiosidade até agora?",
  3: "Qual teoria você tem sobre os acontecimentos deste episódio?",
  4: "O que você acredita que acontecerá a seguir?",
  5: "Qual detalhe parece mais importante neste registro?",
  6: "Que pista deste episódio você acha que vai voltar depois?",
  7: "Qual momento mudou sua leitura da Temporada I?",
  8: "Que escolha dos personagens mais chamou sua atenção?",
  9: "O que este registro revela sobre o arquivo de HESIDIO?",
  10: "Qual teoria você leva para os registros finais?"
};

function pad(number, size = 2) {
  return String(number).padStart(size, "0");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function listEpisodeImages(number) {
  const dir = path.join(root, "public", "manga", "episodios", `ep-${number}`, "images");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .map((file) => `/public/manga/episodios/ep-${number}/images/${file}`);
}

function nav(number) {
  const previous = number > 1 ? `/manga/episodios/ep-${number - 1}/` : "/manga/";
  const next = number < 12 ? `/manga/episodios/ep-${number + 1}/` : "/manga/";
  return `
    <nav class="reader-nav" aria-label="Navegação do leitor">
      <a href="${previous}">Anterior</a>
      <a href="/manga/#episodios">Temporada I</a>
      <a href="${next}">Próximo</a>
    </nav>
  `;
}

function comments(number) {
  return `
    <section class="episode-comments" id="comentarios" data-episode-comments="ep-${number}" aria-label="Comentários do episódio">
      <span>Registro dos leitores</span>
      <h2>COMENTÁRIOS DO ARQUIVO</h2>
      <p>Deixe seu registro sobre este episódio.</p>
      <p class="comment-prompt">${escapeHtml(questions[number])}</p>
      <div class="comment-auth-warning" data-comments-logged-out>
        <p>Entre no Cofre HESIDIO para registrar sua opinião sobre este episódio.</p>
        <a href="/cartas/">ENTRAR NO COFRE</a>
      </div>
      <div data-comments-logged-in hidden>
        <form class="comment-form" data-comment-form>
          <textarea data-comment-content maxlength="500" placeholder="Escreva seu registro sobre este episódio..." aria-label="Comentário sobre o episódio"></textarea>
          <div class="comment-form-footer">
            <span class="comment-counter" data-comment-counter>0/500</span>
            <button type="submit">PUBLICAR REGISTRO</button>
          </div>
        </form>
      </div>
      <p class="comment-status" data-comment-status></p>
      <div class="comment-list" data-comment-list>
        <p class="comments-empty">Consultando registros do arquivo...</p>
      </div>
    </section>
  `;
}

function readerScripts() {
  return `
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  <script src="/assets/hesidio-comments.js" defer></script>
  <script>
    document.addEventListener("contextmenu", (event) => {
      if (event.target && event.target.tagName === "IMG") event.preventDefault();
    });
    document.addEventListener("dragstart", (event) => {
      if (event.target && event.target.tagName === "IMG") event.preventDefault();
    });
    document.querySelectorAll("img").forEach((img) => {
      img.draggable = false;
    });
    const body = document.body;
    const pages = Array.from(document.querySelectorAll(".manga-page"));
    const toggle = document.querySelector("[data-reader-toggle]");
    const previous = document.querySelector("[data-reader-prev]");
    const next = document.querySelector("[data-reader-next]");
    const status = document.querySelector("[data-reader-status]");
    let pageIndex = 0;
    let bookMode = localStorage.getItem("hesidioReaderMode") === "book";

    if (toggle && previous && next && status && pages.length) {
      function updatePage() {
        pages.forEach((page, index) => {
          page.classList.toggle("is-active", index === pageIndex);
        });
        status.textContent = \`Página \${pageIndex + 1} de \${pages.length}\`;
        previous.disabled = pageIndex === 0;
        next.disabled = pageIndex === pages.length - 1;
      }

      function applyReaderMode() {
        body.classList.toggle("book-mode", bookMode);
        toggle.textContent = bookMode ? "Leitura vertical" : "Modo livro";
        toggle.setAttribute("aria-pressed", String(bookMode));
        localStorage.setItem("hesidioReaderMode", bookMode ? "book" : "vertical");
        updatePage();
        if (bookMode) window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function goToPage(index) {
        pageIndex = Math.min(Math.max(index, 0), pages.length - 1);
        updatePage();
        if (bookMode) window.scrollTo({ top: 0, behavior: "smooth" });
      }

      toggle.addEventListener("click", () => {
        bookMode = !bookMode;
        applyReaderMode();
      });
      previous.addEventListener("click", () => goToPage(pageIndex - 1));
      next.addEventListener("click", () => goToPage(pageIndex + 1));
      document.addEventListener("keydown", (event) => {
        if (!bookMode) return;
        if (event.key === "ArrowLeft") goToPage(pageIndex - 1);
        if (event.key === "ArrowRight") goToPage(pageIndex + 1);
      });
      applyReaderMode();
    }
  </script>
`;
}

function releasedPage(number) {
  const title = titles[number];
  const images = listEpisodeImages(number);
  const pages = images.map((src, index) => `
    <figure class="manga-page" oncontextmenu="return false">
      <img src="${src}" alt="HESIDIO EP ${pad(number)} - página ${pad(index + 1, 3)}" draggable="false" loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
      <span class="page-mark"><strong>HESIDIO</strong><small>@hesidio</small></span>
    </figure>
  `).join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EP ${pad(number)} — ${escapeHtml(title)} — HESIDIO</title>
<meta name="description" content="Leia o EP ${pad(number)} de HESIDIO no arquivo oficial da Temporada I.">
<link rel="canonical" href="https://talkglobalapp.com/manga/episodios/ep-${number}/">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="HESIDIO">
<meta property="og:title" content="EP ${pad(number)} — ${escapeHtml(title)} — HESIDIO">
<meta property="og:description" content="Leia o EP ${pad(number)} de HESIDIO no arquivo oficial da Temporada I.">
<meta property="og:url" content="https://talkglobalapp.com/manga/episodios/ep-${number}/">
<meta property="og:image" content="https://talkglobalapp.com/public/studios/hesidio-poster.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/public/studios/hesidio-logo-site.png">
<link rel="stylesheet" href="/assets/hesidio-reader.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852370456334253" crossorigin="anonymous"></script>
</head>
<body class="hesidio-reader-page">
  <header class="reader-topbar">
    <a class="reader-brand" href="/manga/"><img src="/public/studios/hesidio-logo-site.png" alt="">HESIDIO</a>
    <button class="reader-mode" type="button" aria-pressed="false" data-reader-toggle>Modo livro</button>
    ${nav(number)}
  </header>
  <main class="reader-shell">
    <section class="reader-intro">
      <small>Temporada I / EP ${pad(number)} / leitura pública</small>
      <h1>${escapeHtml(title)}</h1>
      <p>Registro público da Temporada I de HESIDIO.</p>
    </section>
    <section class="reader-book-controls" aria-label="Controles do modo livro">
      <button class="reader-button" type="button" data-reader-prev>Anterior</button>
      <span data-reader-status>Página 1 de ${images.length}</span>
      <button class="reader-button" type="button" data-reader-next>Próxima</button>
    </section>
    ${pages || '<p class="reader-empty">As páginas deste registro ainda aguardam upload final.</p>'}
    ${comments(number)}
  </main>
  ${readerScripts()}
</body>
</html>`;
}

function sealedPage(number) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EP ${pad(number)} — Registro Selado — HESIDIO</title>
<meta name="description" content="Os registros finais da Temporada I ainda permanecem selados. A abertura oficial ocorrerá em 13 de junho.">
<link rel="canonical" href="https://talkglobalapp.com/manga/episodios/ep-${number}/">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="HESIDIO">
<meta property="og:title" content="EP ${pad(number)} — Registro Selado — HESIDIO">
<meta property="og:description" content="Os registros finais da Temporada I ainda permanecem selados. A abertura oficial ocorrerá em 13 de junho.">
<meta property="og:url" content="https://talkglobalapp.com/manga/episodios/ep-${number}/">
<meta property="og:image" content="https://talkglobalapp.com/public/studios/hesidio-poster.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/public/studios/hesidio-logo-site.png">
<link rel="stylesheet" href="/assets/hesidio-reader.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852370456334253" crossorigin="anonymous"></script>
</head>
<body class="hesidio-reader-page">
  <header class="reader-topbar">
    <a class="reader-brand" href="/manga/"><img src="/public/studios/hesidio-logo-site.png" alt="">HESIDIO</a>
    ${nav(number)}
  </header>
  <main class="locked-reader">
    <section class="locked-box">
      <span>REGISTRO SELADO / TEMPORADA I</span>
      <h1>Os registros finais permanecem selados.</h1>
      <p>Os registros finais da Temporada I ainda permanecem selados. A abertura oficial ocorrerá em 13 de junho.</p>
      <a class="reader-button" href="/manga/">Voltar para a Temporada I</a>
      <a class="reader-button" href="https://discord.gg/cZb3ktnmc" target="_blank" rel="noopener">Entrar no Discord</a>
    </section>
  </main>
</body>
</html>`;
}

for (let number = 1; number <= 12; number += 1) {
  const dir = path.join(root, "manga", "episodios", `ep-${number}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "index.html"),
    released.has(number) ? releasedPage(number) : sealedPage(number)
  );
}
