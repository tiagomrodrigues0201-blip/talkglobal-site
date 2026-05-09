const COPY = {
  'pt-BR': {
    title: 'Plano prático para {destination}',
    summary: 'Um guia inicial com bairros reais, custo, transporte, documentos, cuidados locais e roteiro para decidir com mais segurança.',
    quality: 'Plano gerado com base em dados locais e recomendações práticas.',
    expansion: 'Este destino ainda está em expansão na base TalkGlobal.',
    bestSeason: 'Melhor época e clima',
    cost: 'Custo diário realista',
    neighborhoods: 'Onde ficar por perfil',
    avoid: 'Regiões e escolhas para evitar',
    itinerary: 'Roteiro realista',
    documents: 'Documentos e visto',
    flights: 'Aeroportos e chegada',
    transport: 'Transporte local',
    scams: 'Golpes comuns',
    safety: 'Segurança prática',
    food: 'Comidas típicas',
    apps: 'Apps úteis',
    phrases: 'Frases úteis traduzidas',
    partners: 'Links de parceiros',
    localTips: 'Dicas locais',
    finalAlert: 'Alerta final',
    save: 'Busca salva localmente',
    premium: 'Quer transformar isso em PDF e receber alertas?',
    premiumText: 'O plano premium será preparado para alertas de preço, histórico e roteiros avançados.'
  },
  en: {
    title: 'Practical plan for {destination}',
    summary: 'A starter guide with real neighborhoods, cost, transport, documents, local risks and a realistic itinerary.',
    quality: 'Plan generated with local data and practical recommendations.',
    expansion: 'This destination is still being expanded in the TalkGlobal database.',
    bestSeason: 'Best time and weather',
    cost: 'Realistic daily cost',
    neighborhoods: 'Where to stay by profile',
    avoid: 'Areas and choices to avoid',
    itinerary: 'Realistic itinerary',
    documents: 'Documents and visa',
    flights: 'Airports and arrival',
    transport: 'Local transport',
    scams: 'Common scams',
    safety: 'Practical safety',
    food: 'Typical food',
    apps: 'Useful apps',
    phrases: 'Useful translated phrases',
    partners: 'Partner links',
    localTips: 'Local tips',
    finalAlert: 'Final alert',
    save: 'Search saved locally',
    premium: 'Want a PDF and price alerts?',
    premiumText: 'Premium will support price alerts, history and advanced itineraries.'
  }
};

const USD_BRL = 5.2;
const COUNTRY_DEFAULTS = {
  tailandia: 'bangkok', thailand: 'bangkok', japao: 'tokyo', japan: 'tokyo', portugal: 'lisboa',
  franca: 'paris', france: 'paris', eua: 'newyork', usa: 'newyork', estadosunidos: 'newyork',
  italia: 'roma', italy: 'roma', espanha: 'madrid', spain: 'madrid', argentina: 'buenosaires',
  chile: 'santiago', mexico: 'mexicocity', méxico: 'mexicocity'
};

const FALLBACK_INSIGHTS = {
  city: 'destino pesquisado',
  country: '',
  summary: 'Ainda não há uma ficha local completa para este destino. Use este plano como primeira triagem e confirme bairros, documentos e segurança em fontes oficiais antes de comprar.',
  bestSeason: 'Prefira baixa ou média temporada, fora de feriados nacionais, férias escolares e grandes eventos locais.',
  climate: ['Pesquise temperatura e chuva no mês exato da viagem.', 'Evite chegar sem checar feriados, greves e eventos grandes.', 'Se for litoral ou montanha, confira temporada de chuva/neve.'],
  dailyCostUsd: { economico: 70, equilibrado: 110, conforto: 180, premium: 330 },
  airports: ['Confira o aeroporto principal e aeroportos alternativos antes de comprar.'],
  airportTransfer: ['Compare transporte público, app e transfer oficial.', 'Evite táxi informal na chegada.', 'Chegue com endereço salvo offline.'],
  neighborhoods: [
    { name: 'Área central bem avaliada', bestFor: 'primeira viagem', budget: 'equilibrado', why: 'Priorize caminhar com segurança e ficar perto de transporte.' },
    { name: 'Bairro residencial com metrô/trem', bestFor: 'família e custo-benefício', budget: 'econômico/equilibrado', why: 'Costuma reduzir custo sem isolar o viajante.' },
    { name: 'Região próxima ao objetivo principal', bestFor: 'negócios, evento ou praia', budget: 'variável', why: 'Evita deslocamentos longos e caros.' }
  ],
  avoid: ['Hospedagem barata longe de transporte.', 'Áreas sem movimento à noite.', 'Reservas sem avaliações recentes.'],
  scams: ['Táxi sem preço claro.', 'Passeios vendidos por abordagens agressivas.', 'Câmbio em local não confiável.'],
  safety: ['Use apps de transporte à noite.', 'Mantenha cópia digital dos documentos.', 'Confirme alertas oficiais antes de sair.'],
  food: ['Prato típico local', 'Mercado gastronômico', 'Café/restaurante bem avaliado'],
  apps: ['Google Maps', 'Uber ou app local', 'Tradutor offline', 'App de transporte público'],
  documents: 'Confirme passaporte, visto, seguro, vacinas e regras de entrada em fontes oficiais antes de comprar.',
  itinerary: ['Dia 1: chegada, check-in e reconhecimento da região.', 'Dia 2: centro histórico e pontos principais.', 'Dia 3: bairro recomendado e experiência local.', 'Dia 4+: bate-volta, compras úteis ou ajuste por perfil.'],
  phrases: ['Hello, could you help me?', 'How much does it cost?', 'Where is the nearest station?']
};

const form = document.getElementById('travelForm');
const results = document.getElementById('results');
const loading = document.getElementById('loadingPlan');

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function titleCase(value) { return String(value || '').trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 7;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diff = Math.round((end - start) / 86400000);
  return Math.min(Math.max(diff || 7, 2), 30);
}
function currency(value, currencyCode = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(value);
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
function listHtml(items) { return '<ul class="insight-list">' + (items || []).map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'; }
function pillsHtml(items) { return '<div class="travel-pill-list">' + (items || []).map(item => '<span class="travel-pill">' + escapeHtml(item) + '</span>').join('') + '</div>'; }

function getDestinationInsights(destination) {
  const data = window.TALKGLOBAL_DESTINATIONS || {};
  const rawKey = normalize(destination);
  const key = COUNTRY_DEFAULTS[rawKey] || rawKey;
  let entry = data[key];
  if (!entry) {
    entry = Object.values(data).find(item => (item.aliases || []).some(alias => normalize(alias) === rawKey || rawKey.includes(normalize(alias)) || normalize(alias).includes(rawKey)));
  }
  if (!entry) {
    const fallback = clone(FALLBACK_INSIGHTS);
    fallback.city = titleCase(destination || 'destino');
    fallback.isExpansion = true;
    fallback.key = rawKey || 'fallback';
    return fallback;
  }
  return { ...clone(entry), isExpansion: false, key };
}

function estimateTravelCost(insights, budget = 'equilibrado', days = 7, travelers = 2) {
  const bucket = insights.dailyCostUsd || FALLBACK_INSIGHTS.dailyCostUsd;
  const dailyUsd = bucket[budget] || bucket.equilibrado || 110;
  const totalUsd = Math.round(dailyUsd * Math.max(days, 1) * Math.max(Number(travelers) || 1, 1));
  return { dailyUsd, totalUsd, totalBrl: Math.round(totalUsd * USD_BRL), travelers: Number(travelers) || 1, days };
}

function getNeighborhoodRecommendations(insights, budget = 'equilibrado', style = 'economico') {
  const all = insights.neighborhoods || [];
  const preferred = all.filter(item => {
    const text = normalize([item.bestFor, item.budget, item.why].join(' '));
    return text.includes(normalize(budget)) || text.includes(normalize(style));
  });
  return (preferred.length ? preferred : all).slice(0, 6);
}

function generateSmartItinerary(insights, days = 7, style = 'economico') {
  const base = insights.itinerary || FALLBACK_INSIGHTS.itinerary;
  const total = Math.min(Math.max(Number(days) || 7, 2), 14);
  const itinerary = [];
  for (let index = 0; index < total; index++) {
    const source = base[index] || (index === total - 1 ? 'Dia ' + (index + 1) + ': manhã livre para compras úteis, café local ou descanso antes do retorno.' : 'Dia ' + (index + 1) + ': ajuste o ritmo com um bairro seguro, comida local e deslocamento simples.');
    const match = String(source).match(/^Dia\s*([^:]+):\s*(.*)$/i);
    itinerary.push({ day: match ? 'Dia ' + match[1] : 'Dia ' + (index + 1), text: match ? match[2] : source });
  }
  return itinerary;
}

function buildPartnerUrl(kind, origin, destination) {
  const q = encodeURIComponent(kind === 'flights' ? `voos baratos ${origin} ${destination}` : kind === 'hotels' ? `hotéis melhores bairros ${destination}` : `documentos visto viagem ${destination}`);
  const marker = window.TALKGLOBAL_TRAVEL_AFFILIATE?.travelpayoutsMarker || '';
  if (marker && kind === 'flights') return `https://www.aviasales.com/search?params=${q}&marker=${encodeURIComponent(marker)}`;
  if (marker && kind === 'hotels') return `https://hotellook.com/?destination=${encodeURIComponent(destination)}&marker=${encodeURIComponent(marker)}`;
  return `https://www.google.com/search?q=${q}`;
}


function hotelSuggestions(plan) {
  const baseNames = plan.neighborhoods.slice(0, 3).map((item) => item.name).join(', ') || plan.insights.city;
  return [
    `${plan.language === 'en' ? 'Start comparing hotels in' : 'Comece comparando hospedagem em'} ${baseNames}.`,
    plan.language === 'en'
      ? 'Prioritize recent reviews about cleanliness, noise, location and real walking distance to transit or the main attraction.'
      : 'Priorize avaliações recentes sobre limpeza, ruído, localização e distância real até metrô, praia ou atração principal.',
    plan.language === 'en'
      ? 'Compare hotel, aparthotel and package deals; in resort destinations, check mandatory fees before paying.'
      : 'Compare hotel, apart-hotel e pacote; em destinos com resort, confira taxas obrigatórias antes de pagar.'
  ];
}

function localTips(plan) {
  const firstBase = plan.neighborhoods[0]?.name || plan.insights.city;
  return [
    plan.language === 'en'
      ? `Use ${firstBase} as your first base if it is your first visit, then adjust by budget and trip style.`
      : `Use ${firstBase} como primeira base se for sua primeira viagem, depois ajuste por orçamento e estilo.`,
    plan.language === 'en'
      ? 'Save offline maps, your hotel address and useful phrases before leaving the airport.'
      : 'Salve mapas offline, endereço do hotel e frases úteis antes de sair do aeroporto.',
    plan.language === 'en'
      ? 'Avoid putting distant attractions on the same day; bad logistics can ruin a good itinerary.'
      : 'Evite juntar atrações distantes no mesmo dia; logística ruim destrói um roteiro bom.'
  ];
}

function buildPlan(data) {
  const insights = getDestinationInsights(data.destination);
  const days = daysBetween(data.startDate, data.endDate);
  const travelers = Number(data.travelers || 2);
  const cost = estimateTravelCost(insights, data.budget, days, travelers);
  const copy = COPY[data.language] || COPY['pt-BR'];
  return {
    ...data,
    copy,
    days,
    travelers,
    insights,
    cost,
    neighborhoods: getNeighborhoodRecommendations(insights, data.budget, data.style),
    itinerary: generateSmartItinerary(insights, days, data.style),
    links: [
      { label: 'Pesquisar voos', href: buildPartnerUrl('flights', data.origin, data.destination) },
      { label: 'Pesquisar hotéis', href: buildPartnerUrl('hotels', data.origin, data.destination) },
      { label: 'Ver documentos oficiais', href: buildPartnerUrl('documents', data.origin, data.destination) }
    ]
  };
}

function renderNeighborhoods(items) {
  return '<div class="neighborhood-grid">' + items.map(item => '<div class="neighborhood-card"><strong>' + escapeHtml(item.name) + '</strong><span>' + escapeHtml(item.bestFor) + '</span><p>' + escapeHtml(item.why) + '</p><em>' + escapeHtml(item.budget) + '</em></div>').join('') + '</div>';
}
function renderItinerary(items) {
  return '<div class="timeline">' + items.map(item => '<div class="day"><strong>' + escapeHtml(item.day) + '</strong><span>' + escapeHtml(item.text) + '</span></div>').join('') + '</div>';
}
function renderPlan(plan) {
  const c = plan.copy;
  const d = plan.insights;
  const title = c.title.replace('{destination}', escapeHtml(d.city || plan.destination));
  results.classList.add('is-visible');
  results.innerHTML = `
    <div class="result-head travel-consultant-head">
      <div>
        <span class="quality-seal"><i></i>${escapeHtml(c.quality)}</span>
        <h2>${title}</h2>
        <p>${escapeHtml(d.summary)}</p>
        ${d.isExpansion ? `<div class="expansion-alert">${escapeHtml(c.expansion)}</div>` : ''}
      </div>
      <span class="travel-badge">${plan.days} dias · ${escapeHtml(plan.budget)}</span>
    </div>
    <div class="result-grid travel-result-grid">
      <article class="result-card wide"><h3>${c.bestSeason}</h3><p>${escapeHtml(d.bestSeason)}</p>${listHtml(d.climate)}</article>
      <article class="result-card"><h3>${c.cost}</h3><div class="price">${currency(plan.cost.dailyUsd * USD_BRL)}</div><p>Por pessoa/dia no perfil ${escapeHtml(plan.budget)}. Total estimado: <strong>${currency(plan.cost.totalBrl)}</strong> para ${plan.travelers} viajante(s), sem passagem aérea.</p></article>
      <article class="result-card"><h3>${c.flights}</h3>${listHtml([...(d.airports || []), ...(d.airportTransfer || [])])}</article>
      <article class="result-card feature"><h3>${c.neighborhoods}</h3>${renderNeighborhoods(plan.neighborhoods)}</article>
      <article class="result-card"><h3>${c.avoid}</h3>${listHtml(d.avoid)}</article>
      <article class="result-card"><h3>${c.transport}</h3>${listHtml(d.airportTransfer)}</article>
      <article class="result-card"><h3>${c.scams}</h3>${listHtml(d.scams)}</article>
      <article class="result-card"><h3>${c.safety}</h3>${listHtml(d.safety)}</article>
      <article class="result-card"><h3>${c.food}</h3>${pillsHtml(d.food)}</article>
      <article class="result-card"><h3>${c.apps}</h3>${pillsHtml(d.apps)}</article>
      <article class="result-card"><h3>${c.documents}</h3><p>${escapeHtml(d.documents)}</p></article>
      <article class="result-card feature"><h3>${c.itinerary}</h3>${renderItinerary(plan.itinerary)}</article>
      <article class="result-card"><h3>${c.phrases}</h3><div class="phrase-list">${(d.phrases || []).map(item => '<div class="phrase"><b>' + escapeHtml(item) + '</b><span>Use em transporte, hotel, lojas e restaurantes.</span></div>').join('')}</div></article>
      <article class="result-card"><h3>${c.partners}</h3><p>Use como ponto de partida e confirme valores, documentos e disponibilidade antes da compra.</p><div class="partner-links">${plan.links.map(link => '<a href="' + link.href + '" rel="nofollow sponsored noopener" target="_blank">' + escapeHtml(link.label) + ' <span>↗</span></a>').join('')}</div></article>
      <article class="result-card final-alert"><h3>${c.finalAlert}</h3><p>Não compre por impulso: valide bairro, deslocamento do aeroporto, regras oficiais de entrada, avaliações recentes de hospedagem e custos extras antes de fechar.</p></article>
    </div>
    <div class="premium-card"><div><strong>${escapeHtml(c.premium)}</strong><p>${escapeHtml(c.premiumText)}</p></div><a href="/contato.html">Quero ser avisado</a></div>
    <p class="travel-note">${escapeHtml(c.save)}. As estimativas ajudam no planejamento inicial. Confirme preços, documentos e regras de entrada em fontes oficiais e parceiros antes de comprar.</p>`;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveSearch(plan) {
  const payload = {
    origin: plan.origin,
    destination: plan.destination,
    budget: plan.budget,
    start_date: plan.startDate || null,
    end_date: plan.endDate || null,
    travel_style: plan.style,
    output_language: plan.language,
    travelers: plan.travelers,
    estimated_cost: { total_brl: plan.cost.totalBrl, total_usd: plan.cost.totalUsd, daily_usd: plan.cost.dailyUsd, days: plan.days },
    result: { destination: plan.insights.city, country: plan.insights.country, is_expansion: plan.insights.isExpansion, neighborhoods: plan.neighborhoods, itinerary: plan.itinerary, cost: plan.cost }
  };
  try {
    const existing = JSON.parse(localStorage.getItem('talkglobal_travel_searches') || '[]');
    existing.unshift({ ...payload, created_at: new Date().toISOString() });
    localStorage.setItem('talkglobal_travel_searches', JSON.stringify(existing.slice(0, 20)));
  } catch (error) {
    console.info('Historico local indisponivel neste navegador.');
  }
  try {
    const response = await fetch('/api/travel-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) console.info('Busca mantida no navegador. API respondeu sem salvar.');
  } catch (error) {
    console.info('Busca mantida no navegador. API indisponivel no momento.');
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  loading.classList.add('is-visible');
  results.classList.remove('is-visible');
  await new Promise(resolve => setTimeout(resolve, 500));
  const plan = buildPlan(data);
  await saveSearch(plan);
  loading.classList.remove('is-visible');
  renderPlan(plan);
});

window.TalkGlobalTravel = { getDestinationInsights, generateSmartItinerary, estimateTravelCost, getNeighborhoodRecommendations };
