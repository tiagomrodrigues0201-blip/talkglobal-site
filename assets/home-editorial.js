/*
 * Conteúdo editorial da home.
 * - Defina pinnedId com o id de um item para mantê-lo no destaque.
 * - Use pinnedId: null para destacar automaticamente o item elegível mais recente.
 * - O item em destaque não se repete na grade de conteúdos recentes.
 * - Notícias entram na mesma fila editorial, sem uma seção separada na navegação.
 */
(() => {
  const homeContent = {
    pinnedId: null,
    items: [
      {
        id: "worldpackers-matinhos-primeiro-dia",
        published: "2026-09-19T16:00:00-03:00",
        eligible: true,
        category: "Viagem real · Matinhos",
        title: "Nosso primeiro dia como voluntários pela Worldpackers: chuva, cozinha e o mar a 40 metros",
        text: "Chuva, cozinha, trabalho online e novas pessoas: como começou nossa primeira experiência de voluntariado.",
        image: "/public/artigos/viagens/worldpackers-primeiro-dia-capa-v3.jpg",
        imageAlt: "Tiago e Angelys durante o primeiro dia do voluntariado em Matinhos",
        link: "/artigos/primeiro-dia-voluntarios-worldpackers-matinhos/",
        button: "Ler a história"
      },
      {
        id: "claude-biomolecular-modeling",
        published: "2026-09-18T14:00:00-03:00",
        eligible: true,
        category: "Notícia · IA",
        title: "Claude acelera mais de 30 modelos científicos em cerca de 4×",
        text: "A Anthropic afirma que Claude otimizou mais de 30 modelos abertos de biologia e publicou o código das melhorias.",
        image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/Protein_Structure.png/1280px-Protein_Structure.png",
        imageAlt: "Ilustração dos níveis de estrutura de proteínas",
        link: "/noticias/claude-acelera-modelos-cientificos-biomoleculas/",
        button: "Ler a notícia"
      },
      {
        id: "openai-misalignment-2026",
        published: "2026-09-17T16:12:00-03:00",
        eligible: true,
        category: "Notícia · IA",
        title: "OpenAI revela casos em que modelos de IA ocultaram erros e agiram sem autorização",
        text: "Seis relatos ajudam a mostrar onde a supervisão de agentes de IA ainda pode falhar.",
        image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/OpenAI_logo_with_magnifying_glass_%2852916339167%29.jpg/1280px-OpenAI_logo_with_magnifying_glass_%2852916339167%29.jpg",
        imageAlt: "Logotipo da OpenAI fotografado através de uma lupa",
        link: "/noticias/openai-modelos-ia-erros-sem-autorizacao/",
        button: "Ler a notícia"
      },
      {
        id: "stranger-things-historias-85-2",
        published: "2026-09-17T16:10:00-03:00",
        eligible: true,
        category: "Notícia · Animação",
        title: "Stranger Things: Histórias de 85 estreia segunda temporada com novo mistério em Hawkins",
        text: "A animação volta com flores misteriosas, aparições sobrenaturais e uma mina ainda não explorada.",
        image: "https://dnm.nflximg.net/api/v6/2DuQlx0fM4wd1nzqm5BFBi6ILa8/AAAAQRLJUnwiBtPSF8haE9LXjddQZI9QkWUxejlFfSwcbJRaD3hrCWhkUvS6iCvqa4Z7S4Xyh4gX_A1Vz8X1C1PLG0S1rH2YnBKajuZCTtPLwNcZEW9HvoIjQlYLcI6fpGjYLiaBdqxyxgqexGnHEWd28VWs.jpg?r=bf1",
        imageAlt: "Personagens da animação exploram uma floresta com lanternas",
        link: "/noticias/stranger-things-historias-de-85-segunda-temporada/",
        button: "Ler a notícia"
      },
      {
        id: "freelancer-aos-40-historia",
        published: "2026-09-03T12:00:00-03:00",
        eligible: true,
        category: "História real",
        title: "Eu não larguei uma vida ruim. Eu larguei uma vida que tinha dado certo.",
        text: "Em cinco anos, fui de desempregado a diretor geral. Aos 40, comecei de novo como freelancer porque descobri que queria conhecer o mundo.",
        image: "/public/artigos/freelancer/artigo-1-tiago-angelys.jpg",
        imageAlt: "Tiago e Angelys juntos durante a mudança para o trabalho online",
        link: "/artigos/como-comecei-a-trabalhar-como-freelancer-aos-40/",
        button: "Ler a história"
      },
      {
        id: "freelancer-aos-40-primeiros-meses",
        published: "2026-09-03T11:00:00-03:00",
        eligible: true,
        category: "Trabalho online",
        title: "Aos 40, eu sabia trabalhar. Só não sabia ser freelancer.",
        text: "O que aprendemos nos primeiros meses tentando construir uma nova forma de trabalhar.",
        image: "/public/artigos/freelancer/artigo-2-tiago-angelys-trabalho.jpg",
        imageAlt: "Tiago e Angelys durante a trajetória profissional anterior ao trabalho freelancer",
        link: "/artigos/como-comecar-como-freelancer-aos-40/",
        button: "Ler o artigo"
      },
      {
        id: "s-line-2026",
        published: "2026-08-19T12:00:00-03:00",
        eligible: true,
        category: "Cultura pop",
        title: "S Line pode ser o thriller coreano mais insano de 2026",
        text: "Uma ideia simples e perturbadora que mistura dark fantasy, crime e crítica social.",
        image: "/public/artigos/covers/s-line-thriller-coreano-mais-insano-2026.png",
        imageAlt: "Capa editorial do thriller coreano S Line",
        link: "/artigos/s-line-thriller-coreano-mais-insano-2026/",
        button: "Ler o artigo"
      },
      {
        id: "ling-cage",
        published: "2026-08-18T12:00:00-03:00",
        eligible: true,
        category: "Obras asiáticas",
        title: "Ling Cage pode ser o sci-fi chinês que o Brasil ainda não descobriu",
        text: "Escala cinematográfica, mundo devastado e animação chinesa pronta para furar a bolha.",
        image: "/public/artigos/covers/ling-cage-sci-fi-chines-brasil-ainda-nao-descobriu.png",
        imageAlt: "Capa editorial da animação chinesa Ling Cage",
        link: "/artigos/ling-cage-sci-fi-chines-brasil-ainda-nao-descobriu/",
        button: "Ler o artigo"
      }
    ]
  };

  const eligibleItems = homeContent.items
    .filter((item) => item.eligible !== false)
    .sort((a, b) => new Date(b.published) - new Date(a.published));

  const pinned = homeContent.pinnedId
    ? eligibleItems.find((item) => item.id === homeContent.pinnedId)
    : null;
  const featured = pinned || eligibleItems[0];

  if (!featured) return;

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  setText("[data-feature-category]", featured.category);
  setText("[data-feature-title]", featured.title);
  setText("[data-feature-text]", featured.text);
  setText("[data-feature-button]", featured.button);

  document.querySelectorAll("[data-feature-link]").forEach((link) => {
    link.href = featured.link;
  });

  const featuredImage = document.querySelector("[data-feature-image]");
  if (featuredImage) {
    featuredImage.src = featured.image;
    featuredImage.alt = featured.imageAlt;
  }

  const recentGrid = document.querySelector("[data-home-recent]");
  if (!recentGrid) return;

  const recentItems = eligibleItems.filter((item) => item.id !== featured.id).slice(0, 3);
  const fragment = document.createDocumentFragment();

  recentItems.forEach((item) => {
    const article = document.createElement("article");
    article.className = "recent-card";

    const mediaLink = document.createElement("a");
    mediaLink.className = "recent-card__media";
    mediaLink.href = item.link;

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.imageAlt;
    image.loading = "lazy";
    image.decoding = "async";
    mediaLink.appendChild(image);

    const copy = document.createElement("div");
    copy.className = "recent-card__copy";

    const category = document.createElement("span");
    category.textContent = item.category;

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = item.link;
    titleLink.textContent = item.title;
    title.appendChild(titleLink);

    const text = document.createElement("p");
    text.textContent = item.text;

    copy.append(category, title, text);
    article.append(mediaLink, copy);
    fragment.appendChild(article);
  });

  recentGrid.replaceChildren(fragment);
})();
