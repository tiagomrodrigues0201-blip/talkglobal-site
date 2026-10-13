import { amazonAssociatesConfig as config } from "./amazon-associates.config.js";
import { buildAffiliateUrl } from "./amazon-recommendations.js";

const groups = [
  { id: "trabalho", label: "Trabalho online", shortLabel: "Trabalho" },
  { id: "viagem", label: "Viagem" },
  { id: "criacao", label: "Criação e tecnologia", shortLabel: "Criação" },
  { id: "leitura", label: "Livros e histórias", shortLabel: "Livros" },
];
const filters = document.getElementById("filters");
const catalog = document.getElementById("catalog");
const status = document.getElementById("catalog-status");
let selected = "todos";
let products = [];
let query = "";
const search = document.getElementById("product-search");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
search?.addEventListener("input", () => { query = normalize(search.value.trim()); renderCards(); });
const productArt = {"logitech-lift":"mouse","sony-wh-ch720n":"headphones","anker-nano-30w":"powerbank","rode-wireless-micro":"microphones","categoria-suporte-notebook":"stand","categoria-mochila-cabine":"backpack","categoria-livros-produtividade":"books"};
const fallbackArt = {trabalho:"stand",viagem:"backpack",criacao:"microphones",leitura:"books"};
function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["amazon.com.br", "www.amazon.com.br"].includes(url.hostname)
      && url.searchParams.get("tag") === config.associateId ? url.href : null;
  } catch { return null; }
}
function renderFilters() {
  filters.replaceChildren();
  for (const filter of [{ id: "todos", label: "Tudo" }, ...groups]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filter.shortLabel || filter.label;
    button.setAttribute("aria-pressed", String(selected === filter.id));
    button.addEventListener("click", () => {
      selected = filter.id;
      for (const child of filters.children) child.setAttribute("aria-pressed", String(child === button));
      renderCards();
    });
    filters.append(button);
  }
}
function renderCards() {
  catalog.replaceChildren();
  const visible = products.filter(item => (selected === "todos" || item.category === selected) && (!query || normalize(item.title + " " + item.why + " " + item.forWhom).includes(query)));
  status.textContent = visible.length ? visible.length + " opções" : "Nenhuma recomendação nesta categoria.";
  for (const item of visible) {
    const card = document.createElement("article");
    card.className = "card";
    const art = document.createElement("div");
    art.className = "catalog-art";
    const image = document.createElement("img");
    image.src = "/assets/vitrine/" + (productArt[item.id] || fallbackArt[item.category] || "books") + ".svg";
    image.alt = "Ilustração de " + item.title;
    image.width = 640; image.height = 480; image.loading = "lazy";
    art.append(image);
    const category = document.createElement("span");
    category.textContent = (groups.find(group => group.id === item.category)?.label || "Outros")
     ;
    const title = document.createElement("h3");
    title.textContent = item.title;
    const benefit = document.createElement("p");
    benefit.textContent = item.why;
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Antes de escolher";
    const caution = document.createElement("p");
    caution.textContent = item.limitations;
    details.append(summary, caution);
    const direct = safeUrl(item.url);
    const action = document.createElement("a");
    action.href = direct || buildAffiliateUrl(item.title);
    action.textContent = "Ver na Amazon ↗";
    action.target = "_blank";
    action.rel = "sponsored noopener noreferrer";
    action.setAttribute("aria-label", action.textContent + " — " + item.title + ", publicidade, abre em nova aba");
    action.addEventListener("click", () => {
      if (typeof window.gtag === "function") window.gtag("event", "amazon_affiliate_click", {
        source: "vitrine", category: item.category, recommendation_type: item.kind, recommendation_id: item.id
      });
    });
    const note = document.createElement("small");
    note.textContent = item.experience === "usamos" ? "Usamos na nossa rotina" : "";
    card.append(art, category, title, benefit, details, action);
    if (item.experience === "usamos") card.append(note);
    catalog.append(card);
  }
}
async function loadProducts() {
  status.textContent = "Carregando recomendações…";
  catalog.setAttribute("aria-busy", "true");
  try {
    const response = await fetch("/data/amazon-products.json");
    if (!response.ok) throw new Error("Catálogo indisponível");
    const body = await response.json();
    if (!Array.isArray(body.products)) throw new Error("Formato inválido");
    products = body.products.filter(item => item.active === true && !item.demonstration
      && item.title && item.forWhom && item.why && item.limitations);
    renderFilters();
    renderCards();
  } catch {
    filters.replaceChildren();
    catalog.replaceChildren();
    status.textContent = "Não foi possível carregar as recomendações. Tente atualizar a página.";
  } finally {
    catalog.setAttribute("aria-busy", "false");
  }
}
loadProducts();
