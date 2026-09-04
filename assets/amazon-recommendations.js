import { amazonAssociatesConfig as config } from "./amazon-associates.config.js";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hash(value) {
  return [...String(value)].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 0);
}

function articleContext(documentRef = document) {
  const canonical = documentRef.querySelector('link[rel="canonical"]')?.href || window.location.href;
  const path = new URL(canonical, window.location.origin).pathname;
  const title = documentRef.querySelector('meta[property="og:title"]')?.content
    || documentRef.querySelector("h1")?.textContent
    || documentRef.title;
  const description = documentRef.querySelector('meta[name="description"]')?.content || "";
  const article = documentRef.querySelector(".article-body, .simple-article__body");
  const text = `${title} ${description} ${path} ${article?.textContent || ""}`;

  return {
    article,
    isHesidio: path.startsWith("/blog/hesidio-") || documentRef.body.classList.contains("hesidio-news-page"),
    path,
    robots: documentRef.querySelector('meta[name="robots"]')?.content || "",
    slug: path.split("/").filter(Boolean).pop()?.replace(/\.html$/, "") || "inicio",
    title: title.trim(),
    text,
    normalizedHeadline: normalize(`${title} ${description} ${path}`),
    normalizedText: normalize(text),
  };
}

function searchRecommendation(context, workTerm) {
  const generic = config.recommendations.asianWorks;
  if (!workTerm) return generic;

  return {
    type: "work-search",
    eyebrow: "Para continuar explorando essa obra",
    title: `Pesquisar ${workTerm} na Amazon`,
    text: `Veja livros, mangás e itens relacionados a ${workTerm} na Amazon.`,
    query: `${workTerm} mangá livro`,
  };
}

export function selectAffiliateRecommendation(context) {
  if (!context.article) return null;

  if (/noindex/i.test(context.robots || "")) return null;

  const text = context.normalizedText;
  const title = normalize(context.title);
  const headline = context.normalizedHeadline || normalize(`${context.title} ${context.path}`);

  const fromRule = (rule) => {
    const recommendationKey = rule.recommendations[hash(context.slug) % rule.recommendations.length];
    return { category: rule.category, recommendation: config.recommendations[recommendationKey] };
  };

  if (context.isHesidio) {
    return { category: "hesidio", recommendation: config.recommendations.darkFantasy };
  }

  if (title.includes("obras asiaticas") || title.includes("futuro dos animes")) {
    return { category: "culture-pop", recommendation: config.recommendations.asianWorks };
  }

  const cultureTerms = ["anime", "manga", "manhwa", "webtoon", "donghua", "dark fantasy", "serie coreana", "cultura pop"];
  const headlineWorkTerm = config.workTerms.find((term) => headline.includes(normalize(term)));
  if (headlineWorkTerm || cultureTerms.some((term) => headline.includes(term))) {
    return { category: "culture-pop", recommendation: searchRecommendation(context, headlineWorkTerm) };
  }

  const headlineRule = config.rules.find((rule) => rule.terms.some((term) => headline.includes(normalize(term))));
  if (headlineRule) return fromRule(headlineRule);

  if (cultureTerms.some((term) => text.includes(term))) {
    const workTerm = config.workTerms.find((term) => text.includes(normalize(term)));
    return { category: "culture-pop", recommendation: searchRecommendation(context, workTerm) };
  }

  const matchedRule = config.rules.find((rule) => rule.terms.some((term) => text.includes(normalize(term))));
  if (!matchedRule) return null;

  return fromRule(matchedRule);
}

export function buildAffiliateUrl(query) {
  const url = new URL("/s", config.marketplace);
  url.searchParams.set("k", query);
  url.searchParams.set("tag", config.associateId);
  return url.href;
}

async function recommendationFromSource(context) {
  if (config.source.mode === "affiliate-links") {
    return selectAffiliateRecommendation(context);
  }

  if (config.source.mode === "api") {
    const response = await fetch(config.source.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article: context.slug,
        title: context.title,
        path: context.path,
      }),
    });
    if (!response.ok) return null;
    return response.json();
  }

  return null;
}

export function trackClick(context, selection, destination, windowRef = window) {
  const event = {
    article: context.slug,
    article_category: selection.category,
    recommendation_type: selection.recommendation.type,
    destination,
  };

  if (typeof windowRef.gtag === "function") {
    windowRef.gtag("event", "amazon_affiliate_click", event);
  } else {
    windowRef.dataLayer = windowRef.dataLayer || [];
    windowRef.dataLayer.push((function queueGtagEvent() { return arguments; })(
      "event",
      "amazon_affiliate_click",
      event,
    ));
  }
}

function renderRecommendation(context, selection) {
  if (document.querySelector(".amazon-recommendation")) return;

  const destination = buildAffiliateUrl(selection.recommendation.query);
  const section = document.createElement("aside");
  section.className = "amazon-recommendation";
  section.setAttribute("aria-labelledby", "amazon-recommendation-title");
  section.innerHTML = `
    <span class="amazon-recommendation__sponsor">Publicidade</span>
    <p class="amazon-recommendation__eyebrow"></p>
    <h2 id="amazon-recommendation-title"></h2>
    <p class="amazon-recommendation__text"></p>
    <a class="amazon-recommendation__link" rel="sponsored noopener noreferrer" target="_blank">Ver na Amazon <span aria-hidden="true">→</span></a>
    <p class="amazon-recommendation__disclosure"></p>
  `;

  section.querySelector(".amazon-recommendation__eyebrow").textContent = selection.recommendation.eyebrow;
  section.querySelector("h2").textContent = selection.recommendation.title;
  section.querySelector(".amazon-recommendation__text").textContent = selection.recommendation.text;
  section.querySelector(".amazon-recommendation__disclosure").textContent = config.disclosure;

  const link = section.querySelector("a");
  link.href = destination;
  link.dataset.amazonArticle = context.slug;
  link.dataset.amazonCategory = selection.category;
  link.dataset.amazonRecommendation = selection.recommendation.type;
  link.addEventListener("click", () => trackClick(context, selection, destination));

  const finalCta = context.article.querySelector(".article-cta-heading");
  if (finalCta) context.article.insertBefore(section, finalCta);
  else context.article.appendChild(section);
}

async function init() {
  const context = articleContext();
  const selection = await recommendationFromSource(context);
  if (selection?.recommendation) renderRecommendation(context, selection);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
