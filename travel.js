const DESTINATION_PROFILES = {
  lisboa: { season: 'abril a junho ou setembro a outubro', daily: 95, neighborhoods: ['Baixa e Chiado para primeira viagem', 'Príncipe Real para gastronomia e caminhada', 'Parque das Nações para estrutura moderna'], visa: 'Brasileiros geralmente podem entrar como turistas por até 90 dias no Espaço Schengen, mas devem confirmar regras atuais antes da viagem.', phrases: ['Bom dia, poderia me ajudar?', 'Quanto custa?', 'Onde fica a estação mais próxima?'] },
  paris: { season: 'abril a junho ou setembro a novembro', daily: 130, neighborhoods: ['Le Marais para caminhar e comer bem', 'Saint-Germain para experiência clássica', 'Bastille para melhor custo-benefício'], visa: 'Verifique as regras do Espaço Schengen, seguro viagem, comprovação de hospedagem e passagem de saída.', phrases: ['Bonjour, pouvez-vous m’aider ?', 'Combien ça coûte ?', 'Où est le métro le plus proche ?'] },
  orlando: { season: 'fevereiro a maio ou setembro a novembro', daily: 145, neighborhoods: ['Lake Buena Vista para parques', 'International Drive para custo-benefício', 'Winter Park para uma viagem mais local'], visa: 'Viajantes brasileiros precisam verificar visto americano válido e regras de entrada antes de comprar.', phrases: ['Hi, could you help me?', 'How much is it?', 'Where is the nearest shuttle?'] },
  miami: { season: 'fevereiro a maio ou novembro', daily: 150, neighborhoods: ['Brickell para negócios', 'Miami Beach para turismo', 'Doral para compras e logística'], visa: 'Viajantes brasileiros precisam verificar visto americano válido e regras de entrada.', phrases: ['Hi, I have a reservation.', 'Could you show me the total price?', 'Where can I get a ride?'] },
  tokyo: { season: 'março a maio ou outubro a novembro', daily: 125, neighborhoods: ['Shinjuku para transporte', 'Asakusa para cultura', 'Shibuya para vida urbana'], visa: 'Confirme exigências de entrada, passaporte, seguro e regras sanitárias diretamente em fontes oficiais.', phrases: ['Sumimasen, tasukete moraemasu ka?', 'Ikura desu ka?', 'Eki wa doko desu ka?'] },
  londres: { season: 'maio a junho ou setembro', daily: 150, neighborhoods: ['South Bank para primeira viagem', 'Shoreditch para criatividade', 'Paddington para conexões'], visa: 'Verifique regras atuais do Reino Unido, incluindo autorização eletrônica quando aplicável.', phrases: ['Hi, could you help me?', 'How much is this?', 'Where is the nearest tube station?'] },
  roma: { season: 'abril a junho ou setembro a outubro', daily: 110, neighborhoods: ['Centro Storico para primeira viagem', 'Trastevere para noite e comida', 'Prati para ficar perto do Vaticano'], visa: 'Verifique regras do Espaço Schengen e documentos de hospedagem, seguro e saída.', phrases: ['Buongiorno, mi può aiutare?', 'Quanto costa?', 'Dov’è la stazione più vicina?'] },
  buenosaires: { season: 'março a maio ou setembro a novembro', daily: 70, neighborhoods: ['Palermo para gastronomia', 'Recoleta para caminhada', 'San Telmo para cultura'], visa: 'Brasileiros costumam entrar com documento válido, mas confirme regras atuais antes de viajar.', phrases: ['Hola, ¿me puede ayudar?', '¿Cuánto cuesta?', '¿Dónde está la estación más cercana?'] }
};

const COPY = {
  'pt-BR': { title: 'Plano inicial para {destination}', summary: 'Uma primeira versão para comparar custos, escolher região, entender documentos e decidir os próximos passos com mais clareza.', bestSeason: 'Melhor época', cost: 'Custo estimado', flights: 'Voos sugeridos', hotels: 'Hotéis e pacotes', neighborhoods: 'Bairros recomendados', itinerary: 'Roteiro inicial', documents: 'Documentos e visto', phrases: 'Frases úteis', partners: 'Links de parceiros', save: 'Busca salva localmente', premium: 'Quer transformar isso em PDF e receber alertas?', premiumText: 'O plano premium será preparado para alertas de preço, histórico e roteiros avançados.' },
  en: { title: 'Starter plan for {destination}', summary: 'A first version to compare costs, choose areas, check documents and decide your next steps with more clarity.', bestSeason: 'Best time', cost: 'Estimated cost', flights: 'Suggested flights', hotels: 'Hotels and packages', neighborhoods: 'Recommended areas', itinerary: 'Starter itinerary', documents: 'Documents and visa', phrases: 'Useful phrases', partners: 'Partner links', save: 'Search saved locally', premium: 'Want a PDF and price alerts?', premiumText: 'Premium will support price alerts, history and advanced itineraries.' }
};

const PARTNER_LINKS = {
  flights: 'https://www.aviasales.com/?marker=SEU_MARKER_TRAVELPAYOUTS',
  hotels: 'https://www.hotellook.com/?marker=SEU_MARKER_TRAVELPAYOUTS',
  packages: '#'
};

const form = document.getElementById('travelForm');
const results = document.getElementById('results');
const loading = document.getElementById('loadingPlan');

function normalize(value) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function daysBetween(startDate, endDate) { if (!startDate || !endDate) return 7; const start = new Date(startDate + 'T00:00:00'); const end = new Date(endDate + 'T00:00:00'); const diff = Math.round((end - start) / 86400000); return Math.min(Math.max(diff || 7, 2), 30); }
function currency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value); }
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function getProfile(destination) { const key = normalize(destination); return DESTINATION_PROFILES[key] || Object.entries(DESTINATION_PROFILES).find(([name]) => key.includes(name) || name.includes(key))?.[1] || { season: 'meses de baixa ou média temporada, evitando feriados locais e grandes eventos', daily: 100, neighborhoods: ['Região central com transporte público', 'Bairro residencial seguro e bem avaliado', 'Área próxima ao objetivo principal da viagem'], visa: 'Confirme passaporte, visto, vacinas, seguro viagem e regras de entrada em fontes oficiais antes de comprar.', phrases: ['Hello, could you help me?', 'How much does it cost?', 'Where is the nearest station?'] }; }
function budgetMultiplier(budget) { return { economico: 0.78, equilibrado: 1, conforto: 1.35, premium: 1.9 }[budget] || 1; }

function buildPlan(data) {
  const profile = getProfile(data.destination);
  const days = daysBetween(data.startDate, data.endDate);
  const travelers = Number(data.travelers || 2);
  const mult = budgetMultiplier(data.budget);
  const lodging = profile.daily * days * travelers * mult;
  const food = 42 * days * travelers * mult;
  const local = 28 * days * travelers * mult;
  const total = Math.round((lodging + food + local) * 5.2);
  const copy = COPY[data.language] || COPY['pt-BR'];
  return { ...data, days, total, profile, copy, itinerary: [{ day: 'Dia 1', text: 'Chegada, check-in, caminhada leve e reconhecimento da região.' }, { day: 'Dia 2', text: 'Centro histórico, principais pontos e uma refeição típica sem pressa.' }, { day: 'Dia 3', text: 'Bairro recomendado, museu/experiência local e pôr do sol em área segura.' }, { day: 'Dia 4+', text: 'Bate-volta, compras úteis, cafés de trabalho ou ajuste conforme seu estilo.' }], flights: ['Compare ida e volta em datas próximas', 'Teste aeroportos alternativos quando existirem', 'Evite comprar antes de conferir bagagem e conexão'], hotels: ['Priorize nota alta e localização perto de transporte', 'Compare hotel, apart-hotel e pacote quando fizer sentido', 'Leia avaliações recentes sobre limpeza e ruído'] };
}

function partnerLinks(origin, destination) {
  const search = encodeURIComponent(origin + ' ' + destination);
  return [{ label: 'Comparar voos', href: PARTNER_LINKS.flights + '&utm_source=talkglobal&q=' + search }, { label: 'Buscar hotéis', href: PARTNER_LINKS.hotels + '&utm_source=talkglobal&q=' + search }, { label: 'Pacotes em breve', href: PARTNER_LINKS.packages }];
}

function renderPlan(plan) {
  const c = plan.copy;
  const title = c.title.replace('{destination}', escapeHtml(plan.destination));
  const links = partnerLinks(plan.origin, plan.destination);
  results.classList.add('is-visible');
  results.innerHTML = '<div class="result-head"><div><h2>' + title + '</h2><p>' + c.summary + '</p></div><span class="travel-badge">' + plan.days + ' dias · ' + escapeHtml(plan.budget) + '</span></div><div class="result-grid">' +
    '<article class="result-card"><h3>' + c.bestSeason + '</h3><p>' + escapeHtml(plan.profile.season) + '.</p></article>' +
    '<article class="result-card"><h3>' + c.cost + '</h3><div class="price">' + currency(plan.total) + '</div><p>Estimativa para hospedagem, alimentação e transporte local de ' + plan.travelers + ' viajante(s), sem passagem aérea.</p></article>' +
    '<article class="result-card"><h3>' + c.flights + '</h3><ul>' + plan.flights.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></article>' +
    '<article class="result-card"><h3>' + c.hotels + '</h3><ul>' + plan.hotels.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></article>' +
    '<article class="result-card"><h3>' + c.neighborhoods + '</h3><ul>' + plan.profile.neighborhoods.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></article>' +
    '<article class="result-card"><h3>' + c.documents + '</h3><p>' + escapeHtml(plan.profile.visa) + '</p></article>' +
    '<article class="result-card feature"><h3>' + c.itinerary + '</h3><div class="timeline">' + plan.itinerary.map(item => '<div class="day"><strong>' + item.day + '</strong><span>' + escapeHtml(item.text) + '</span></div>').join('') + '</div></article>' +
    '<article class="result-card"><h3>' + c.phrases + '</h3><div class="phrase-list">' + plan.profile.phrases.map(item => '<div class="phrase"><b>' + escapeHtml(item) + '</b><span>Use em transporte, hotel, lojas e restaurantes.</span></div>').join('') + '</div></article>' +
    '<article class="result-card"><h3>' + c.partners + '</h3><p>Use como ponto de partida e confirme tudo no parceiro antes da compra.</p><div class="partner-links">' + links.map(link => '<a href="' + link.href + '" rel="nofollow sponsored noopener" target="_blank">' + escapeHtml(link.label) + ' <span>↗</span></a>').join('') + '</div></article></div>' +
    '<div class="premium-card"><div><strong>' + c.premium + '</strong><p>' + c.premiumText + '</p></div><a href="/contato.html">Quero ser avisado</a></div><p class="travel-note">' + c.save + '. Esta versão usa estimativas e placeholders de afiliados. Com as chaves de API, a busca pode consultar parceiros reais e salvar o histórico no Supabase.</p>';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveSearch(plan) {
  const payload = { origin: plan.origin, destination: plan.destination, budget: plan.budget, start_date: plan.startDate || null, end_date: plan.endDate || null, travel_style: plan.style, output_language: plan.language, travelers: plan.travelers, estimated_cost: { total_brl: plan.total, days: plan.days }, result: plan };
  const existing = JSON.parse(localStorage.getItem('talkglobal_travel_searches') || '[]');
  existing.unshift({ ...payload, created_at: new Date().toISOString() });
  localStorage.setItem('talkglobal_travel_searches', JSON.stringify(existing.slice(0, 20)));
  try { await fetch('/api/travel-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (error) { console.info('Travel search saved locally. API not configured yet.'); }
}

form?.addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(form).entries()); loading.classList.add('is-visible'); results.classList.remove('is-visible'); await new Promise(resolve => setTimeout(resolve, 850)); const plan = buildPlan(data); await saveSearch(plan); loading.classList.remove('is-visible'); renderPlan(plan); });
