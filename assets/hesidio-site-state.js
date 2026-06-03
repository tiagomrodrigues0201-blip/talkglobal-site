(() => {
  const state = {
    currentEpisodeNumber: 2,
    currentEpisodeTitle: "A Garota que Sobreviveu",
    currentEpisodeUrl: "/manga/episodios/ep-2/",
    currentEpisodeStatus: "DISPONÍVEL",
    currentCardSlug: "ren_natal",
    currentCardTitle: "Ren Natal",
    latestArticleTitle: "Por Que Berserk Continua Sendo o Maior Mangá Dark Fantasy Já Criado?",
    latestArticleUrl: "/artigos/por-que-berserk-continua-sendo-o-maior-dark-fantasy/",
    homeHeroImage: "/public/studios/hesidio-poster.png",
    homeHeroImageAlt: "Fragmento visual restrito de HESIDIO.",
    weeklyArticleEnabled: true,
    weeklyArticleStatus: "ARTIGO DA SEMANA",
    weeklyArticleTitle: "Por Que Berserk Continua Sendo o Maior Mangá Dark Fantasy Já Criado?",
    weeklyArticleUrl: "/artigos/por-que-berserk-continua-sendo-o-maior-dark-fantasy/",
    weeklyArticleImage: "/articles/berserk-dark-fantasy-cover.webp",
    weeklyArticleImageAlt: "Guerreiro solitário diante de um eclipse vermelho em um cenário dark fantasy devastado.",
    weeklyArticleSubtitle: "Uma análise sobre a obra que definiu o Dark Fantasy moderno e continua influenciando mangás, jogos e universos sombrios.",
    featuredVideoEnabled: false,
    featuredVideoStatus: "DESTAQUE EM VÍDEO",
    featuredVideoSlug: "registro-001",
    featuredVideoTitle: "O Primeiro Despertar de Ren Hazama",
    featuredVideoUrl: "/videos/registro-001.html",
    featuredVideoImage: "/public/videos/registro-001-poster.jpg",
    featuredVideoImageAlt: "Miniatura do Registro 001 do Arquivo de Vídeos HESIDIO.",
    featuredVideoSubtitle: "Registro audiovisual preservado para futuras cenas, bastidores e fragmentos oficiais de HESIDIO.",
    nextEpisodeNumber: 3,
    nextEpisodeDate: "06/06/2026",
    episodes: [
      { number: 1, date: "23/05/2026", title: "O Acidente", url: "/manga/episodios/ep-1/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-1/images/001.png", coverAlt: "Capa do Episódio 1 de HESIDIO" },
      { number: 2, date: "30/05/2026", title: "A Garota que Sobreviveu", url: "/manga/episodios/ep-2/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-2/images/001.png", coverAlt: "Capa do Episódio 2 de HESIDIO" },
      { number: 3, date: "06/06/2026", title: "Registro selado", url: "/manga/episodios/ep-3/", status: "SELADO" },
      { number: 4, date: "13/06/2026", title: "Registro selado", url: "/manga/episodios/ep-4/", status: "SELADO" },
      { number: 5, date: "20/06/2026", title: "Registro selado", url: "/manga/episodios/ep-5/", status: "SELADO" },
      { number: 6, date: "27/06/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-6/", status: "RESTRITO", premium: true },
      { number: 7, date: "04/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-7/", status: "RESTRITO", premium: true },
      { number: 8, date: "11/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-8/", status: "RESTRITO", premium: true },
      { number: 9, date: "18/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-9/", status: "RESTRITO", premium: true },
      { number: 10, date: "25/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-10/", status: "RESTRITO", premium: true },
      { number: 11, date: "01/08/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-11/", status: "RESTRITO", premium: true }
    ],
    releasedCharacters: [
      {
        slug: "ren-hazama",
        name: "Ren Hazama",
        url: "/personagens/ren-hazama/",
        image: "/public/studios/ren-dossie.png",
        imageAlt: "Dossiê visual oficial de Ren Hazama em HESIDIO",
        summary: "Silencioso, ferido e perigoso sem querer ser.",
        fullSummary: "Silencioso, ferido e perigoso sem querer ser. O arquivo só confirma que algo nele responde antes das palavras.",
        file: "REN-01",
        signal: "SILÊNCIO",
        episodeNumber: 1
      },
      {
        slug: "airi-kurohana",
        name: "Airi Kurohana",
        url: "/personagens/airi-kurohana/",
        image: "/public/studios/airi-dossie.png",
        imageAlt: "Dossiê visual oficial de Airi Kurohana em HESIDIO",
        summary: "Humana, perdida e emocionalmente viva.",
        fullSummary: "Humana demais para um mundo que começa a falhar. Sua presença preserva calor onde tudo parece perder forma.",
        file: "AIR-02",
        signal: "HUMANO",
        episodeNumber: 1
      }
    ],
    videos: [
      {
        slug: "registro-001",
        number: 1,
        status: "OFFLINE / MODELO",
        title: "O Primeiro Despertar de Ren Hazama",
        url: "/videos/registro-001.html",
        thumbnail: "/public/videos/registro-001-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 001 do Arquivo de Vídeos HESIDIO.",
        description: "Estrutura reservada para o primeiro registro audiovisual oficial de HESIDIO.",
        summary: "Um modelo de registro em vídeo para apresentar cenas, teasers ou fragmentos oficiais sem carregar mídia automaticamente.",
        characters: ["Ren Hazama"],
        context: "Registro preparado para acompanhar o arquivo público de HESIDIO sem revelar spoilers centrais.",
        videoSrc: "/public/videos/registro-001.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      },
      {
        slug: "registro-002",
        number: 2,
        status: "OFFLINE / MODELO",
        title: "Arquivo Visual Selado",
        url: "/videos/registro-002.html",
        thumbnail: "/public/videos/registro-002-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 002 do Arquivo de Vídeos HESIDIO.",
        description: "Estrutura reservada para um futuro registro audiovisual do universo HESIDIO.",
        summary: "Modelo pronto para um novo vídeo, com SEO, thumbnail, contexto e navegação interna.",
        characters: ["A confirmar"],
        context: "Registro ainda sem conteúdo final. O arquivo permanece preparado para revisão editorial.",
        videoSrc: "/public/videos/registro-002.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      },
      {
        slug: "registro-003",
        number: 3,
        status: "OFFLINE / MODELO",
        title: "Fragmento Audiovisual Lacrado",
        url: "/videos/registro-003.html",
        thumbnail: "/public/videos/registro-003-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 003 do Arquivo de Vídeos HESIDIO.",
        description: "Estrutura reservada para expandir o arquivo de vídeos oficiais de HESIDIO.",
        summary: "Página-modelo para futuras publicações em vídeo, sem autoplay e sem iframe carregado antes do clique.",
        characters: ["A confirmar"],
        context: "Conteúdo em modo offline até aprovação e inserção do vídeo final.",
        videoSrc: "/public/videos/registro-003.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      },
      {
        slug: "registro-004",
        number: 4,
        status: "OFFLINE / MODELO",
        title: "Registro Visual 004",
        url: "/videos/registro-004.html",
        thumbnail: "/public/videos/registro-004-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 004 do Arquivo de Vídeos HESIDIO.",
        description: "Registro audiovisual preparado em versão leve para revisão editorial.",
        summary: "Arquivo otimizado para o site, com carregamento apenas após o clique do leitor.",
        characters: ["A confirmar"],
        context: "Conteúdo preservado em modo offline até aprovação final.",
        videoSrc: "/public/videos/registro-004.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      },
      {
        slug: "registro-005",
        number: 5,
        status: "OFFLINE / MODELO",
        title: "Registro Visual 005",
        url: "/videos/registro-005.html",
        thumbnail: "/public/videos/registro-005-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 005 do Arquivo de Vídeos HESIDIO.",
        description: "Registro audiovisual preparado em versão leve para revisão editorial.",
        summary: "Arquivo otimizado para o site, com thumbnail inicial e vídeo carregado sob demanda.",
        characters: ["A confirmar"],
        context: "Conteúdo preservado em modo offline até aprovação final.",
        videoSrc: "/public/videos/registro-005.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      },
      {
        slug: "registro-006",
        number: 6,
        status: "OFFLINE / MODELO",
        title: "Registro Visual 006",
        url: "/videos/registro-006.html",
        thumbnail: "/public/videos/registro-006-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 006 do Arquivo de Vídeos HESIDIO.",
        description: "Registro audiovisual preparado em versão leve para revisão editorial.",
        summary: "Arquivo comprimido para navegação rápida, mantendo o visual do arquivo HESIDIO.",
        characters: ["A confirmar"],
        context: "Conteúdo preservado em modo offline até aprovação final.",
        videoSrc: "/public/videos/registro-006.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      },
      {
        slug: "registro-007",
        number: 7,
        status: "OFFLINE / MODELO",
        title: "Registro Visual 007",
        url: "/videos/registro-007.html",
        thumbnail: "/public/videos/registro-007-poster.jpg",
        thumbnailAlt: "Miniatura do Registro 007 do Arquivo de Vídeos HESIDIO.",
        description: "Registro audiovisual preparado em versão leve para revisão editorial.",
        summary: "O maior arquivo bruto foi convertido para uma versão web muito mais leve, sem autoplay.",
        characters: ["A confirmar"],
        context: "Conteúdo preservado em modo offline até aprovação final.",
        videoSrc: "/public/videos/registro-007.mp4",
        embedUrl: "",
        publishDate: "2026-06-02"
      }
    ]
  };

  const padEpisode = (number) => String(number).padStart(2, "0");
  const currentEpisode = () => state.episodes.find((episode) => episode.number === state.currentEpisodeNumber) || state.episodes[0];
  const nextEpisode = () => state.episodes.find((episode) => episode.number === state.nextEpisodeNumber);
  const compactDate = (date) => String(date || "").slice(0, 5);

  const computed = {
    currentEpisodeLabel: () => `EP ${padEpisode(state.currentEpisodeNumber)}`,
    currentEpisodeStatusLabel: () => "EPISÓDIO ATUAL",
    currentEpisodeButtonText: () => "Ler episódio atual",
    currentEpisodeSummary: () => `Último registro liberado: EP ${padEpisode(state.currentEpisodeNumber)} — ${state.currentEpisodeTitle}.`,
    currentEpisodeCardTitle: () => `${computed.currentEpisodeLabel()} — ${state.currentEpisodeTitle}`,
    currentEpisodeCardCopy: () => "O último registro liberado está aberto no arquivo oficial.",
    currentEpisodeMetaDescription: () => `Portal oficial de HESIDIO. Episódio atual: EP ${padEpisode(state.currentEpisodeNumber)} — ${state.currentEpisodeTitle}. Novos registros em formato de mangá são liberados no arquivo oficial.`,
    nextEpisodeLabel: () => `EP ${padEpisode(state.nextEpisodeNumber)}`,
    nextEpisodeSummary: () => {
      const episode = nextEpisode();
      return episode ? `Próximo registro: ${computed.nextEpisodeLabel()} em ${episode.date}.` : "Próximo registro: data a confirmar.";
    },
    nextEpisodeDate: () => nextEpisode()?.date || state.nextEpisodeDate,
    currentCardSummary: () => `Carta atual do cofre: ${state.currentCardTitle}.`,
    currentCardMetaDescription: () => `Cofre oficial de cartas colecionáveis de HESIDIO. Faça login para desbloquear a carta atual: ${state.currentCardTitle}.`,
    currentCardImage: () => `/public/cards/${state.currentCardSlug}.png`,
    currentCardImageAbsolute: () => `https://talkglobalapp.com/public/cards/${state.currentCardSlug}.png`
  };

  const getValue = (key) => {
    if (Object.prototype.hasOwnProperty.call(state, key)) return state[key];
    if (Object.prototype.hasOwnProperty.call(computed, key)) return computed[key]();
    return "";
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  const episodeTitle = (episode) => {
    if (episode.number <= state.currentEpisodeNumber) return episode.title;
    return episode.premium ? "Arquivo restrito" : "Registro selado";
  };

  const episodeDateLabel = (episode) => {
    if (episode.number <= state.currentEpisodeNumber) return "LIBERADO";
    return episode.date;
  };

  const episodeCopy = (episode) => {
    if (episode.number <= state.currentEpisodeNumber) return "Registro público aberto.";
    if (episode.premium) return "Registro reservado para acesso premium.";
    return "Nome e descrição permanecem ocultos.";
  };

  const releasedEpisodes = () => state.episodes.filter((episode) => episode.number <= state.currentEpisodeNumber && episode.coverImage);
  const releasedCharacters = () => state.releasedCharacters.filter((character) => character.episodeNumber <= state.currentEpisodeNumber);
  const videoBySlug = (slug) => state.videos.find((video) => video.slug === slug) || state.videos[0];
  const padVideo = (number) => String(number).padStart(3, "0");

  const videoStatusLabel = (video) => video.status || "OFFLINE / MODELO";

  const renderVideoFrame = (video) => `
    <div class="video-frame" data-video-frame>
      <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.thumbnailAlt)}" loading="lazy" decoding="async">
      <div class="video-frame__veil" aria-hidden="true"></div>
      <button class="video-frame__play" type="button" data-video-play data-video-src="${escapeHtml(video.videoSrc || "")}" data-video-embed="${escapeHtml(video.embedUrl || "")}" data-video-title="${escapeHtml(video.title)}" ${video.videoSrc || video.embedUrl ? "" : "disabled"}>
        ${video.videoSrc || video.embedUrl ? "Carregar vídeo" : "Vídeo aguardando liberação"}
      </button>
    </div>
  `;

  const renderStack = (target) => {
    target.innerHTML = state.episodes.map((episode) => `
      <a href="${escapeHtml(episode.url)}">
        <span>${escapeHtml(episode.number <= state.currentEpisodeNumber ? "Liberado" : compactDate(episode.date))}</span>
        <strong>EP ${padEpisode(episode.number)}</strong>
        <em>${escapeHtml(episode.status)}</em>
      </a>
    `).join("");
  };

  const renderCards = (target) => {
    target.innerHTML = state.episodes.map((episode) => `
      <a class="episode-card ${episode.number <= state.currentEpisodeNumber ? "is-first" : ""} ${episode.premium ? "is-premium" : ""}" href="${escapeHtml(episode.url)}">
        <small>${escapeHtml(episodeDateLabel(episode))} · EP ${padEpisode(episode.number)}</small>
        <h3>${escapeHtml(episodeTitle(episode))}</h3>
        <p>${escapeHtml(episodeCopy(episode))}</p>
        <strong>${escapeHtml(episode.status)}</strong>
      </a>
    `).join("");
  };

  const renderEpisodeCovers = (target) => {
    target.innerHTML = releasedEpisodes().map((episode) => `
      <a class="released-cover-card" href="${escapeHtml(episode.url)}">
        <figure class="watermarked-image watermarked-image--page watermarked-image--soft-center" oncontextmenu="return false">
          <img src="${escapeHtml(episode.coverImage)}" alt="${escapeHtml(episode.coverAlt || `Capa do EP ${padEpisode(episode.number)} de HESIDIO`)}" draggable="false" loading="lazy" decoding="async">
          <span class="watermarked-image__center" aria-hidden="true">HESIDIO</span>
          <span class="watermarked-image__pattern" aria-hidden="true">HESIDIO · @hesidio</span>
          <span class="watermarked-image__diagonal" aria-hidden="true">HESIDIO</span>
          <span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span>
        </figure>
        <small>EP ${padEpisode(episode.number)}</small>
        <h3>${escapeHtml(episode.title)}</h3>
        <p>${escapeHtml(episodeCopy(episode))}</p>
      </a>
    `).join("");
  };

  const renderCharacters = (target) => {
    const layout = target.dataset.hesidioCharacters || "hub";
    target.innerHTML = releasedCharacters().map((character) => {
      if (layout === "manga") {
        return `
          <article class="character-open">
            <a href="${escapeHtml(character.url)}">
              <div class="portrait forbidden-image wm-subtle" data-src="${escapeHtml(character.image)}" data-label="DOSSIÊ LIBERADO" style="--image: url('${escapeHtml(character.image)}')"><span class="image-mark">HESIDIO</span><span class="diagonal-mark" aria-hidden="true">HESIDIO</span><span class="pattern-mark" aria-hidden="true">HESIDIO · @hesidio</span></div>
              <small>Arquivo público</small>
              <h3>${escapeHtml(character.name)}</h3>
              <p>${escapeHtml(character.summary)}</p>
            </a>
          </article>
        `;
      }

      if (layout === "home") {
        return `
          <article class="character-card character-card--${escapeHtml(character.slug.split("-")[0])}" data-file="${escapeHtml(character.file)}" data-signal="${escapeHtml(character.signal)}">
            <figure class="watermarked-image watermarked-image--page watermarked-image--soft-center" oncontextmenu="return false"><img src="${escapeHtml(character.image)}" alt="${escapeHtml(character.imageAlt)}" draggable="false" loading="lazy" decoding="async"><span class="watermarked-image__center" aria-hidden="true">HESIDIO</span><span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span></figure>
            <small>Dossiê liberado pelo arquivo oficial</small>
            <h3>${escapeHtml(character.name)}</h3>
            <p>${escapeHtml(character.fullSummary)}</p>
          </article>
        `;
      }

      return `
        <a class="hub-character-card" href="${escapeHtml(character.url)}">
          <figure class="watermarked-image watermarked-image--page watermarked-image--soft-center" oncontextmenu="return false">
            <img src="${escapeHtml(character.image)}" alt="${escapeHtml(character.imageAlt)}" draggable="false" loading="lazy" decoding="async">
            <span class="watermarked-image__center" aria-hidden="true">DOSSIÊ LIBERADO</span>
            <span class="watermarked-image__pattern" aria-hidden="true">HESIDIO · @hesidio</span>
            <span class="watermarked-image__diagonal" aria-hidden="true">HESIDIO</span>
            <span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span>
          </figure>
          <small>Arquivo público</small>
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.summary)}</p>
        </a>
      `;
    }).join("");
  };

  const renderVideosList = (target) => {
    target.innerHTML = state.videos.map((video) => `
      <article class="video-record-card">
        <a href="${escapeHtml(video.url)}" aria-label="Abrir ${escapeHtml(video.title)}">
          <figure>
            <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.thumbnailAlt)}" loading="lazy" decoding="async">
            <span>REGISTRO ${padVideo(video.number)}</span>
          </figure>
          <div>
            <small>${escapeHtml(videoStatusLabel(video))}</small>
            <h2>${escapeHtml(video.title)}</h2>
            <p>${escapeHtml(video.description)}</p>
            <strong>Abrir registro</strong>
          </div>
        </a>
      </article>
    `).join("");
  };

  const renderVideoRecord = (target) => {
    const video = videoBySlug(target.dataset.videoSlug);
    target.innerHTML = `
      <section class="video-record-hero">
        <div class="container video-record-layout">
          <div>
            <span class="kicker">REGISTRO ${padVideo(video.number)} // ${escapeHtml(videoStatusLabel(video))}</span>
            <h1>${escapeHtml(video.title)}</h1>
            <p>${escapeHtml(video.description)}</p>
          </div>
          <aside>
            <span>ARQUIVO AUDIOVISUAL</span>
            <strong>OFFLINE</strong>
            <p>Estrutura preparada para revisão editorial antes da publicação pública.</p>
          </aside>
        </div>
      </section>
      <section class="video-record-body">
        <div class="container video-record-body__grid">
          <article class="video-record-main">
            ${renderVideoFrame(video)}
            <div class="video-record-text">
              <span>RESUMO</span>
              <p>${escapeHtml(video.summary)}</p>
              <span>CONTEXTO DA CENA</span>
              <p>${escapeHtml(video.context)}</p>
            </div>
          </article>
          <aside class="video-record-side">
            <div>
              <span>PERSONAGENS ENVOLVIDOS</span>
              <ul>${video.characters.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>
            </div>
            <div>
              <span>LINKS INTERNOS</span>
              <a href="/manga/">Episódios</a>
              <a href="/personagens/ren-hazama/">Personagens</a>
              <a href="/cartas/">Cartas</a>
              <a href="/blog/">Artigos</a>
            </div>
          </aside>
        </div>
      </section>
      <section class="video-explore-section">
        <div class="container">
          <span class="kicker">CONTINUAR EXPLORANDO</span>
          <div class="video-explore-grid">
            <a href="/manga/"><span>Episódios</span><strong>Arquivo do mangá</strong></a>
            <a href="/personagens/ren-hazama/"><span>Personagens</span><strong>Dossiês públicos</strong></a>
            <a href="/cartas/"><span>Cartas</span><strong>Cofre colecionável</strong></a>
            <a href="/blog/"><span>Artigos</span><strong>Registros editoriais</strong></a>
          </div>
        </div>
      </section>
    `;
  };

  function applySiteState() {
    document.querySelectorAll("[data-hesidio-state-text]").forEach((element) => {
      element.textContent = getValue(element.dataset.hesidioStateText);
    });

    document.querySelectorAll("[data-hesidio-state-href]").forEach((element) => {
      element.setAttribute("href", getValue(element.dataset.hesidioStateHref));
    });

    document.querySelectorAll("[data-hesidio-state-content]").forEach((element) => {
      element.setAttribute("content", getValue(element.dataset.hesidioStateContent));
    });

    document.querySelectorAll("[data-hesidio-state-src]").forEach((element) => {
      element.setAttribute("src", getValue(element.dataset.hesidioStateSrc));
    });

    document.querySelectorAll("[data-hesidio-state-alt]").forEach((element) => {
      element.setAttribute("alt", getValue(element.dataset.hesidioStateAlt));
    });

    document.querySelectorAll("[data-hesidio-episodes]").forEach((element) => {
      if (element.dataset.hesidioEpisodes === "cards") renderCards(element);
      if (element.dataset.hesidioEpisodes === "stack") renderStack(element);
    });

    document.querySelectorAll("[data-hesidio-episode-covers]").forEach(renderEpisodeCovers);
    document.querySelectorAll("[data-hesidio-characters]").forEach(renderCharacters);
    document.querySelectorAll("[data-hesidio-videos-list]").forEach(renderVideosList);
    document.querySelectorAll("[data-hesidio-video-record]").forEach(renderVideoRecord);
    document.dispatchEvent(new CustomEvent("hesidio:content-rendered"));
  }

  window.HESIDIO_SITE_STATE = Object.freeze({
    ...state,
    computed,
    getValue,
    videoBySlug,
    applySiteState
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySiteState);
  } else {
    applySiteState();
  }
})();
