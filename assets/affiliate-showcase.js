import { amazonAssociatesConfig as config } from "./amazon-associates.config.js";
import { buildAffiliateUrl } from "./amazon-recommendations.js";

const groups = [
  { id: "trabalho", label: "Trabalho online" },
  { id: "viagem", label: "Viagem" },
  { id: "criacao", label: "Criação e tecnologia" },
  { id: "leitura", label: "Livros e histórias" },
];
const filters = document.getElementById("filters");
const catalog = document.getElementById("catalog");
const status = document.getElementById("catalog-status");
let selected = "todos";
let products = [];
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
    button.textContent = filter.label;
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
  const visible = products.filter(item => selected === "todos" || item.category === selected);
  status.textContent = visible.length ? visible.length + " recomendações nesta seleção." : "Nenhuma recomendação nesta categoria.";
  for (const item of visible) {
    const card = document.createElement("article");
    card.className = "card";
    const art = document.createElement("div");
    art.className = "catalog-art";
    art.setAttribute("aria-hidden", "true");
    art.textContent = item.category === "viagem" ? "✈" : item.category === "criacao" ? "◉" : item.category === "leitura" ? "▤" : "⌘";
    const category = document.createElement("span");
    category.textContent = (groups.find(group => group.id === item.category)?.label || "Outros")
      + " · " + (item.kind === "product" ? "Modelo pesquisado" : "Categoria");
    const title = document.createElement("h3");
    title.textContent = item.title;
    const details = document.createElement("dl");
    for (const [label, value] of [["Para quem", item.forWhom], ["Por que considerar", item.why], ["Antes de escolher", item.limitations]]) {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      details.append(term, description);
    }
    const direct = safeUrl(item.url);
    const action = document.createElement("a");
    action.href = direct || buildAffiliateUrl(item.title);
    action.textContent = direct ? "Ver produto na Amazon" : item.kind === "product" ? "Pesquisar modelo na Amazon" : "Pesquisar categoria na Amazon";
    action.target = "_blank";
    action.rel = "sponsored noopener noreferrer";
    action.setAttribute("aria-label", action.textContent + " — " + item.title + ", publicidade, abre em nova aba");
    action.addEventListener("click", () => {
      if (typeof window.gtag === "function") window.gtag("event", "amazon_affiliate_click", {
        source: "vitrine", category: item.category, recommendation_type: item.kind, recommendation_id: item.id
      });
    });
    const note = document.createElement("small");
    note.textContent = "Publicidade · " + (item.experience === "usamos" ? "Uso próprio confirmado" : "Pesquisa editorial · Não testado por nós");
    card.append(art, category, title, details, action, note);
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
