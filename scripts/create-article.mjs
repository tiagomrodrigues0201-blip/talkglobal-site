import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const siteUrl = "https://talkglobalapp.com";
const today = new Date().toISOString().slice(0, 10);
const adsenseScript = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7852370456334253"
     crossorigin="anonymous"></script>`;
const adUnits = {
  display: `<div class="ad-slot ad-slot-display" aria-label="Publicidade">
  <span>Publicidade</span>
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-7852370456334253"
       data-ad-slot="5879922379"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`,
  inArticle: `<div class="ad-slot ad-slot-in-article" aria-label="Publicidade">
  <span>Publicidade</span>
  <ins class="adsbygoogle"
       style="display:block; text-align:center;"
       data-ad-layout="in-article"
       data-ad-format="fluid"
       data-ad-client="ca-pub-7852370456334253"
       data-ad-slot="9448691781"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`,
  multiplex: `<div class="ad-slot ad-slot-multiplex" aria-label="Publicidade">
  <span>Publicidade</span>
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-format="autorelaxed"
       data-ad-client="ca-pub-7852370456334253"
       data-ad-slot="9973193556"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`,
};

function usage() {
  console.log(`Uso:
node scripts/create-article.mjs \\
  --title "Título da matéria" \\
  --category "Tecnologia" \\
  --description "Subtítulo curto" \\
  --slug "titulo-da-materia" \\
  --theme "tech" \\
  --read "5 min" \\
  --source drafts/artigo.md

Temas aceitos: remote, digital, property, tech, money`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function socialSlug(post) {
  const fromLink = String(post.link || "").split("/").pop()?.replace(/\.html$/, "");
  return fromLink || slugify(post.titulo);
}

function defaultInstagramCopy(post) {
  return `${post.titulo}\n\n${post.descricao}\n\nLeia a analise completa no TalkGlobal.\n\n#TalkGlobal #MercadoGlobal #Tecnologia #RendaOnline #TrabalhoRemoto`;
}

function defaultImagePrompt(post) {
  const theme = inferTheme(post);
  const elements = {
    remote: "notebook, trabalhador moderno, mapa global discreto, conexoes digitais e grafico sutil",
    digital: "celular, carrinho digital, cards de interface fintech e grafico de crescimento",
    property: "predios modernos, chave, dashboard imobiliario e grafico de valorizacao",
    tech: "interface de IA, notebook, elementos digitais, painel de produtividade e linhas de conexao",
    money: "notebook, moedas digitais, dashboard financeiro e grafico de crescimento",
  }[theme] || "elementos editoriais de tecnologia, mercado global e graficos sutis";

  return `Imagem vertical 1080x1350 para Instagram, estilo noticia premium nivel Forbes/Exame, fundo branco ou cinza muito claro, visual moderno e editorial. Titulo grande: "${post.titulo}". Subtitulo: "${post.descricao}". Usar ${elements}. Cores: azul #1e3a8a como base, verde #16a34a apenas para destaque, preto e branco. Layout limpo, tipografia forte, sem poluicao visual, sem parecer anuncio.`;
}

function extractSection(markdown, heading) {
  const pattern = new RegExp(`(^|\\n)## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = markdown.match(pattern);
  return match ? match[2].trim() : "";
}

function stripSocialSections(markdown) {
  return markdown
    .replace(/(^|\n)## Copy para Instagram\n[\s\S]*?(?=\n## |$)/gi, "")
    .replace(/(^|\n)## Ideia de imagem\n[\s\S]*?(?=\n## |$)/gi, "")
    .trim();
}

function socialKitFromMarkdown(markdown, post) {
  return {
    copy: extractSection(markdown, "Copy para Instagram") || defaultInstagramCopy(post),
    prompt: extractSection(markdown, "Ideia de imagem") || defaultImagePrompt(post),
  };
}

function writeSocialKit(post, kit = {}) {
  const folder = join("social", socialSlug(post));
  mkdirSync(folder, { recursive: true });
  const copy = (kit.copy || defaultInstagramCopy(post)).trim();
  const prompt = (kit.prompt || defaultImagePrompt(post)).trim();
  writeFileSync(join(folder, "copy.txt"), `${copy}\n`);
  writeFileSync(join(folder, "prompt-imagem.txt"), `${prompt}\n`);
  writeFileSync(join(folder, "info.txt"), `Titulo: ${post.titulo}\nCategoria: ${post.categoria}\nArtigo: ${siteUrl}${post.link}\nStatus da imagem: criar manualmente\n`);
}

function readPosts() {
  const source = readFileSync("posts.js", "utf8");
  const match = source.match(/const posts = (\[[\s\S]*?\]);/);
  if (!match) throw new Error("Nao consegui ler posts.js.");
  return JSON.parse(match[1]);
}

function writePosts(posts) {
  writeFileSync("posts.js", `const posts = ${JSON.stringify(posts, null, 2)};\n`);
}

function inferTheme(post) {
  const text = `${post.categoria} ${post.titulo}`.toLowerCase();
  if (text.includes("imó") || text.includes("imo") || text.includes("apartamento")) return "property";
  if (text.includes("site") || text.includes("oportunidade")) return "digital";
  if (text.includes("ia") || text.includes("tecnologia")) return "tech";
  if (text.includes("dólar") || text.includes("renda")) return "money";
  return "remote";
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    out.push(`<ul>\n${list.map((item) => `<li>${inline(item)}</li>`).join("\n")}\n</ul>`);
    list = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      out.push(`<div class="callout">${inline(line.slice(2))}</div>`);
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return out.join("\n\n");
}

function inline(text) {
  return esc(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
}

function nav(active = "") {
  const items = [
    ["Mercado", "/blog/trabalho-remoto-internacional-crescimento.html"],
    ["Tecnologia", "/blog/inteligencia-artificial-freelancers-produtividade.html"],
    ["Renda", "/blog/ganhar-em-dolar.html"],
    ["Imóveis", "/blog/mercado-imobiliario-brasil-comprar-ou-investir-2026.html"],
    ["Blog", "/blog/"],
    ["Kit", "/extensao.html"],
  ];
  return `
    <header class="topbar">
      <div class="container nav">
        <a href="/" class="brand" aria-label="TalkGlobal">
          <img src="/icon48.png" alt="" width="38" height="38">
          <span>TalkGlobal</span>
        </a>
        <nav class="menu" aria-label="Navegação principal">
          ${items.map(([label, href]) => `<a ${active === label ? 'class="active"' : ""} href="${href}">${label}</a>`).join("")}
        </nav>
      </div>
    </header>`;
}

function footer() {
  return `
    <footer class="footer container">
      <div>
        <strong>TalkGlobal</strong>
        <p>Mercado global, tecnologia e novas formas de renda para brasileiros atentos ao mundo.</p>
      </div>
      <p><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p>
    </footer>`;
}

function pageHead({ title, description, path = "/", type = "website", schema }) {
  const canonical = `${siteUrl}${path}`;
  const image = `${siteUrl}/icon128.png`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="TalkGlobal">
<meta name="theme-color" content="#1e3a8a">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="TalkGlobal">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/icon128.png">
<link rel="stylesheet" href="/assets/talkglobal.css">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ""}
${adsenseScript}
</head>`;
}

function visual(theme) {
  const labels = {
    remote: ["global", "online"],
    digital: ["site 01", "cashback"],
    property: ["imóveis", "2026"],
    tech: ["IA", "produtividade"],
    money: ["dólar", "renda"],
  }[theme] ?? ["mercado", "análise"];

  return `
    <div class="visual visual-${theme}" aria-hidden="true">
      <div class="visual-card"><span></span><span></span><span></span><b></b></div>
      <div class="visual-device"></div>
      <div class="visual-chart">
        <i></i><i></i><i></i><i></i>
        <svg viewBox="0 0 220 120" role="img">
          <path d="M18 96 C48 72 72 78 104 48 C138 16 166 28 204 12" />
          <polyline points="178,12 206,12 206,42" />
        </svg>
      </div>
      <div class="visual-pill"><span>${labels[0]}</span><strong>${labels[1]}</strong></div>
    </div>`;
}

function home(posts) {
  const featured = posts[0];
  const top = posts.slice(1, 4);
  const latest = posts.slice(4);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "TalkGlobal",
        url: `${siteUrl}/`,
        logo: `${siteUrl}/icon128.png`,
        description: "Portal editorial sobre mercado global, tecnologia, inteligência artificial, renda online, trabalho remoto, imóveis e oportunidades digitais.",
        knowsAbout: ["mercado global", "tecnologia", "inteligência artificial", "renda online", "trabalho remoto", "imóveis", "oportunidades digitais"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "TalkGlobal",
        alternateName: "TalkGlobal App",
        url: `${siteUrl}/`,
        inLanguage: "pt-BR",
        publisher: { "@id": `${siteUrl}/#organization` },
        description: "Análises sobre tecnologia, IA, renda online, trabalho remoto, imóveis e tendências globais para entender oportunidades antes da maioria.",
      },
    ],
  };
  return `${pageHead({
    title: "TalkGlobal | Mercado global, tecnologia e oportunidades",
    description: "Análises sobre tecnologia, IA, renda online, trabalho remoto, imóveis e tendências globais para entender oportunidades antes da maioria.",
    path: "/",
    schema,
  })}
<body>
${nav()}
<main>
  <section class="container cover">
    <a class="lead-story" href="${featured.link}">
      <div>
        <span class="kicker">${featured.categoria}</span>
        <h1>${featured.titulo}</h1>
        <p>${featured.descricao}</p>
        <small>Redação TalkGlobal · ${featured.tempo}</small>
      </div>
      ${visual(inferTheme(featured))}
    </a>
    <aside class="briefing">
      <span class="section-label">Briefing</span>
      ${top.map((post) => `
        <a href="${post.link}">
          <strong>${post.titulo}</strong>
          <span>${post.categoria} · ${post.tempo}</span>
        </a>`).join("")}
    </aside>
  </section>
  <section class="container channels" aria-label="Canais editoriais">
    ${[
      ["Mercado Global", "Tendências de trabalho, renda internacional e competição global."],
      ["Tecnologia", "IA, ferramentas digitais e produtividade aplicada ao mercado."],
      ["Oportunidades", "Guias práticos para encontrar renda e vantagem no digital."],
      ["Imóveis", "Leituras estratégicas sobre moradia, investimento e valorização."],
    ].map(([title, text]) => `<article><span></span><h2>${title}</h2><p>${text}</p></article>`).join("")}
  </section>
  <section class="container editorial-grid">
    <div>
      <span class="section-label">Últimas análises</span>
      <div class="story-list">
        ${latest.map((post) => `
          <a href="${post.link}">
            <span>${post.categoria}</span>
            <strong>${post.titulo}</strong>
            <p>${post.descricao}</p>
          </a>`).join("")}
      </div>
    </div>
    <aside class="most-read">
      <span class="section-label">Mais lidas</span>
      ${posts.slice(1, 6).map((post, index) => `<a href="${post.link}"><em>${String(index + 1).padStart(2, "0")}</em><strong>${post.titulo}</strong></a>`).join("")}
    </aside>
  </section>
  <section class="container home-ad">
    ${adUnits.display}
  </section>
  <section class="container product-cta">
    <div>
      <span class="kicker">Kit TalkGlobal</span>
      <h2>Venda e responda clientes em inglês com mais confiança.</h2>
      <p>Um kit prático com guia, extensão, modelos de mensagens e produtos recomendados para transformar comunicação em inglês em oportunidade real.</p>
    </div>
    <a href="/extensao.html">Conhecer o kit</a>
  </section>
  <section class="container newsletter">
    <div>
      <span class="kicker">Newsletter</span>
      <h2>Receba o mapa das oportunidades globais.</h2>
      <p>Uma curadoria objetiva sobre tecnologia, renda e movimentos de mercado.</p>
    </div>
    <a href="/blog/">Ler agora</a>
  </section>
</main>
${footer()}
</body>
</html>`;
}

function blogIndex(posts) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Blog TalkGlobal",
    url: `${siteUrl}/blog/`,
    hasPart: posts.map((post) => ({ "@type": "Article", headline: post.titulo, url: `${siteUrl}${post.link}` })),
  };
  return `${pageHead({
    title: "Blog TalkGlobal | Mercado, tecnologia e oportunidades",
    description: "Notícias e análises sobre mercado global, IA, renda online, trabalho remoto, imóveis e oportunidades digitais.",
    path: "/blog/",
    schema,
  })}
<body>
${nav("Blog")}
<main class="container blog-page">
  <header class="archive-hero">
    <span class="kicker">Arquivo editorial</span>
    <h1>Notícias, análises e oportunidades</h1>
    <p>Conteúdos para quem quer entender mercado, tecnologia e novas formas de gerar renda no mundo.</p>
  </header>
  <section class="archive-grid">
    ${posts.map((post) => `
      <a class="archive-card" href="${post.link}">
        <span>${post.categoria}</span>
        <h2>${post.titulo}</h2>
        <p>${post.descricao}</p>
        <small>Redação TalkGlobal · ${post.tempo}</small>
      </a>`).join("")}
  </section>
</main>
${footer()}
</body>
</html>`;
}

function articlePage(post, content, posts) {
  const related = posts.filter((item) => item.link !== post.link).slice(0, 3);
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.titulo,
    description: post.descricao,
    datePublished: post.date,
    dateModified: today,
    author: { "@type": "Organization", name: "Redação TalkGlobal" },
    publisher: {
      "@type": "Organization",
      name: "TalkGlobal",
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon128.png` },
    },
    mainEntityOfPage: `${siteUrl}${post.link}`,
  };
  return `${pageHead({
    title: `${post.titulo} | TalkGlobal`,
    description: post.descricao,
    path: post.link,
    type: "article",
    schema,
  })}
<body>
${nav()}
<main class="article-shell">
  <article class="article">
    <header class="article-header">
      <div>
        <a class="breadcrumb" href="/blog/">Blog</a>
        <span class="kicker">${post.categoria}</span>
        <h1>${post.titulo}</h1>
        <p>${post.descricao}</p>
        <div class="byline">
          <span>Redação TalkGlobal</span>
          <span>Publicado em ${formatDate(post.date)}</span>
          <span>${post.tempo} de leitura</span>
        </div>
      </div>
      ${visual(inferTheme(post))}
    </header>
    <section class="key-points">
      <strong>Principais pontos</strong>
      <ul>
        <li>O mercado global está abrindo novas janelas para quem acompanha tecnologia e renda.</li>
        <li>Oportunidades tendem a favorecer quem observa dados, timing e execução com disciplina.</li>
        <li>Este conteúdo tem caráter informativo e não substitui análise financeira individual.</li>
      </ul>
    </section>
    ${adUnits.inArticle}
    <div class="article-body">
      ${content}
    </div>
    ${adUnits.display}
  </article>
  <aside class="article-sidebar">
    <div class="side-box">
      <span class="section-label">Relacionadas</span>
      ${related.map((item) => `<a href="${item.link}"><strong>${item.titulo}</strong><span>${item.categoria}</span></a>`).join("")}
    </div>
    ${adUnits.multiplex}
  </aside>
</main>
${footer()}
</body>
</html>`;
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function rebuildSharedPages(posts) {
  writePosts(posts);
  writeFileSync("index.html", home(posts));
  writeFileSync("blog/index.html", blogIndex(posts));

  const urls = [
    "/",
    "/blog/",
    ...posts.map((post) => post.link),
    "/extensao.html",
    "/privacy.html",
    "/terms.html",
  ];
  writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${siteUrl}${url}</loc>
    <lastmod>${today}</lastmod>
  </url>`).join("\n\n")}
</urlset>
`);
  writeFileSync("robots.txt", `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.rebuild) {
  rebuildSharedPages(readPosts());
  console.log("Reconstruidos: index.html, blog/index.html, posts.js, sitemap.xml e robots.txt");
  process.exit(0);
}

if (!args.title || !args.category || !args.description || !args.source) {
  usage();
  process.exit(1);
}

if (!existsSync(args.source)) {
  throw new Error(`Arquivo Markdown nao encontrado: ${args.source}`);
}

const slug = slugify(args.slug || args.title);
const file = `${slug}.html`;
const link = `/blog/${file}`;
const posts = readPosts();
if (posts.some((post) => post.link === link)) {
  throw new Error(`Ja existe artigo com este slug: ${link}`);
}

const post = {
  titulo: args.title,
  categoria: args.category,
  descricao: args.description,
  link,
  tempo: args.read || "4 min",
  date: args.date || today,
};

if (args.theme) post.theme = args.theme;
mkdirSync("blog", { recursive: true });

const sourceMarkdown = readFileSync(args.source, "utf8");
const socialKit = socialKitFromMarkdown(sourceMarkdown, post);
const content = markdownToHtml(stripSocialSections(sourceMarkdown));
const nextPosts = [post, ...posts];
writeFileSync(join("blog", file), articlePage(post, content, nextPosts));
writeSocialKit(post, socialKit);
rebuildSharedPages(nextPosts);

console.log(`Artigo criado: blog/${file}`);
console.log("Atualizados: index.html, blog/index.html, posts.js, sitemap.xml e robots.txt");
