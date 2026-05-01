import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sendApprovalEmail } from "./sendApprovalEmail.js";

const APPROVAL_PATH = "automation/approval.json";
const RECENCY_DAYS = 3;
const MIN_SOURCES = 3;
const MIN_FACTS = 3;
const ALLOWED_TOPICS = [
  {
    category: "Mercado global",
    theme: "remote",
    query: "trabalho remoto internacional empresas globais tecnologia mercado when:3d",
    title: "O trabalho remoto global entra em uma nova fase — e a disputa por talentos mudou",
    description: "Empresas e profissionais passam a disputar oportunidades em um mercado cada vez menos preso à localização.",
  },
  {
    category: "Tecnologia",
    theme: "tech",
    query: "inteligência artificial produtividade freelancers trabalho tecnologia tendências when:3d",
    title: "A inteligência artificial está mudando a vantagem de quem trabalha online",
    description: "Ferramentas digitais estão alterando produtividade, competição e posicionamento profissional.",
  },
  {
    category: "Oportunidades digitais",
    theme: "digital",
    query: "marketplaces cashback compras online renda extra tecnologia oportunidades digitais when:3d",
    title: "Marketplaces começam a revelar novas oportunidades digitais além da compra",
    description: "Compras, revenda e ferramentas online aproximam consumo, tecnologia e geração de renda.",
  },
  {
    category: "Imóveis",
    theme: "property",
    query: "mercado imobiliário Brasil 2026 juros crédito imóveis valorização when:3d",
    title: "O mercado imobiliário começa a desenhar uma janela que poucos estão acompanhando",
    description: "Juros, crédito e comportamento de compra recolocam imóveis no radar de quem pensa no longo prazo.",
  },
  {
    category: "Renda online",
    theme: "money",
    query: "renda online economia prática dólar trabalho remoto mercado global when:3d",
    title: "A busca por renda online ganha força em um mercado mais global e competitivo",
    description: "Tecnologia, câmbio e trabalho remoto ampliam as alternativas para quem quer diversificar renda.",
  },
];

function loadEnv() {
  try {
    const env = readFileSync(".env", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && !(key in process.env)) process.env[key] = rest.join("=");
    }
  } catch {
    // .env is optional. Environment variables can come from the shell/CI.
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return args;
}

function decodeHtml(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extractTag(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function extractSource(item) {
  return extractTag(item, "source") || "Fonte externa";
}

async function fetchSources(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const response = await fetch(url, { headers: { "User-Agent": "TalkGlobalBot/1.0" } });
  if (!response.ok) throw new Error(`Falha ao pesquisar fontes: ${response.status} ${response.statusText}`);
  const xml = await response.text();
  const cutoff = daysAgo(RECENCY_DAYS);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, 12)
    .map((match) => {
      const item = match[1];
      const publishedAt = extractTag(item, "pubDate");
      return {
        title: extractTag(item, "title"),
        url: extractTag(item, "link"),
        source: extractSource(item),
        publishedAt,
        summary: extractTag(item, "description"),
      };
    })
    .filter((source) => source.title && source.url)
    .filter((source) => {
      const date = new Date(source.publishedAt);
      return !Number.isNaN(date.valueOf()) && date >= cutoff;
    });
}

function extractConcreteFacts(sources) {
  const facts = [];
  const seen = new Set();
  const concretePattern = /(\d+(?:[.,]\d+)?\s?%|\d+(?:[.,]\d+)?\s?(?:milhões|milhão|bilhões|bilhão|trilhões|trilhão|mil|dias|anos|meses|empresas|vagas|usuários|clientes|dólares|reais|US\$|R\$)|alta|queda|cresceu|caiu|aumentou|reduziu|recorde|lançou|anunciou|aprovou|mudou|expansão|demanda|juros|crédito|contratações)/i;

  for (const source of sources) {
    const text = `${source.title}. ${source.summary}`.replace(/\s+/g, " ").trim();
    if (!concretePattern.test(text)) continue;
    const sentence = text.split(/(?<=[.!?])\s+/).find((part) => concretePattern.test(part)) || source.title;
    const fact = `${source.source}: ${sentence}`;
    const key = fact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push({
      text: fact,
      source: source.source,
      url: source.url,
    });
  }

  return facts.slice(0, 6);
}

function hasEnoughSignal(sources, facts) {
  return sources.length >= MIN_SOURCES && facts.length >= MIN_FACTS;
}

function instagramCopy(article) {
  return `${article.title}

${article.description}

O ponto não é correr atrás de promessa fácil. É observar os sinais antes de eles virarem consenso.

Leia a análise completa no TalkGlobal.

#TalkGlobal #Tecnologia #MercadoGlobal #RendaOnline #OportunidadesDigitais`;
}

function imagePrompt(article) {
  const elementMap = {
    remote: "notebook, pessoa trabalhando, mapa global discreto e gráfico de crescimento",
    digital: "celular, carrinho digital, dashboard de marketplace e gráfico de crescimento",
    property: "prédios modernos, chave, painel de dados imobiliários e gráfico de valorização",
    tech: "interface de inteligência artificial, notebook, cards digitais e gráfico sutil",
    money: "dashboard financeiro, símbolo de dólar discreto, celular e barras de crescimento",
  };

  return `Crie uma imagem vertical 1080x1350 para Instagram, estilo notícia premium nível Forbes/Exame, layout limpo, moderno e editorial. Identidade TalkGlobal: azul #1e3a8a como base estrutural em ícones, linhas, interfaces e formas principais; verde #16a34a apenas para destaques de crescimento, dinheiro e pontos-chave. Fundo branco ou cinza muito claro com leve gradiente azul quase imperceptível. Título grande: "${article.title}". Subtítulo: "${article.description}". Elementos visuais: ${elementMap[article.theme] || elementMap.remote}. Minimalista, espaçamento amplo, tipografia forte, sem poluição visual e sem parecer anúncio.`;
}

function makeArticle(topic, sources, facts) {
  const date = new Date().toISOString().slice(0, 10);
  const sourceBullets = sources
    .slice(0, 5)
    .map((source) => `- ${source.source}: [${source.title}](${source.url})`)
    .join("\n");
  const contextBullets = sources
    .slice(0, 3)
    .map((source) => `- ${source.source} publicou: **${source.title}**`)
    .join("\n");
  const factBullets = facts
    .slice(0, 5)
    .map((fact) => `- ${fact.text}`)
    .join("\n");
  const slug = slugify(`${topic.title}-${date}`);
  const article = {
    title: topic.title,
    category: topic.category,
    description: topic.description,
    slug,
    filename: `${slug}.html`,
    theme: topic.theme,
    read: "5 min",
    date,
    sources: sources.slice(0, 5),
    facts: facts.slice(0, 6),
    markdown: `${topic.description}

O movimento ainda está em formação, mas já aparece em fontes recentes acompanhadas pela TalkGlobal nos últimos ${RECENCY_DAYS} dias. A leitura mais importante não é procurar promessa fácil: é entender onde tecnologia, mercado e comportamento começam a se encontrar.

> A oportunidade costuma aparecer primeiro como mudança de comportamento, depois como manchete.

## O que aconteceu

${contextBullets}

## Dados e sinais concretos

${factBullets}

Essas notícias apontam para um cenário em que decisões de trabalho, consumo e investimento estão cada vez mais conectadas a plataformas digitais, dados e alcance global.

## Por que isso importa

Quando um movimento aparece em mais de uma fonte, ele merece atenção. Não significa que toda pessoa deve agir imediatamente, mas indica que o mercado está testando novos caminhos.

Para quem acompanha oportunidades digitais, o ponto central é observar três fatores:

- se a tendência resolve um problema real;
- se existe adoção por empresas, consumidores ou profissionais;
- se há sinais de continuidade, e não apenas uma onda passageira.

## O que observar agora

O próximo passo é acompanhar dados, anúncios de empresas, mudanças regulatórias e comportamento de usuários. O risco está em transformar tendência em promessa; a vantagem está em estudar cedo e agir com critério.

## Conclusão

O mercado global está ficando mais rápido, mais digital e mais competitivo. Quem entende os sinais antes do consenso não precisa apostar no escuro: pode se preparar com mais contexto.

## Fontes

${sourceBullets}
`,
  };
  article.instagramCopy = instagramCopy(article);
  article.imagePrompt = imagePrompt(article);
  return article;
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const limit = Number(args.count || 2);
  const topics = ALLOWED_TOPICS.sort(() => Math.random() - 0.5);
  const articles = [];

  for (const topic of topics) {
    if (articles.length >= limit) break;
    const sources = await fetchSources(topic.query);
    const facts = extractConcreteFacts(sources);
    if (!hasEnoughSignal(sources, facts)) {
      console.log(`Pauta descartada: ${topic.category} (${sources.length} fontes recentes, ${facts.length} fatos concretos).`);
      continue;
    }
    articles.push(makeArticle(topic, sources, facts));
  }

  if (articles.length < limit) {
    throw new Error(`Novidade real insuficiente. Gerados ${articles.length} de ${limit} artigos. Nenhum artigo deve ser escrito sem ${MIN_SOURCES}+ fontes dos últimos ${RECENCY_DAYS} dias e ${MIN_FACTS}+ fatos concretos.`);
  }

  const approval = {
    status: "pending",
    generatedAt: new Date().toISOString(),
    approvedAt: null,
    publishedAt: null,
    articles,
  };

  mkdirSync("automation", { recursive: true });
  writeFileSync(APPROVAL_PATH, `${JSON.stringify(approval, null, 2)}\n`);

  if (!args.skipEmail) {
    await sendApprovalEmail(approval);
  }

  console.log(`Geradas ${articles.length} propostas em ${APPROVAL_PATH}`);
  console.log("Status: pending. Nada foi publicado.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
