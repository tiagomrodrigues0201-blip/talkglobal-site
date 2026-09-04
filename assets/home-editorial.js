/*
 * Conteúdo editorial da home.
 * - Defina pinnedId com o id de um item para mantê-lo no destaque.
 * - Use pinnedId: null para destacar automaticamente o item elegível mais recente.
 * - O item em destaque não se repete na grade de conteúdos recentes.
 */
(() => {
  const homeContent = {
    pinnedId: "freelancer-aos-40-historia",
    items: [
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
