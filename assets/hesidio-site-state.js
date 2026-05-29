(() => {
  const state = {
    currentEpisodeNumber: 2,
    currentEpisodeTitle: "A Garota que Sobreviveu",
    currentEpisodeUrl: "/manga/episodios/ep-2/",
    currentEpisodeStatus: "DISPONÍVEL",
    currentCardSlug: "ren_natal",
    currentCardTitle: "Ren Natal",
    latestArticleTitle: "HESIDIO: quando o mundo começa a esquecer a si mesmo",
    latestArticleUrl: "/blog/hesidio-mundo-esqueceu-memoria-identidade.html",
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

    document.querySelectorAll("[data-hesidio-episodes]").forEach((element) => {
      if (element.dataset.hesidioEpisodes === "cards") renderCards(element);
      if (element.dataset.hesidioEpisodes === "stack") renderStack(element);
    });

    document.querySelectorAll("[data-hesidio-episode-covers]").forEach(renderEpisodeCovers);
    document.querySelectorAll("[data-hesidio-characters]").forEach(renderCharacters);
  }

  window.HESIDIO_SITE_STATE = Object.freeze({
    ...state,
    computed,
    getValue,
    applySiteState
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySiteState);
  } else {
    applySiteState();
  }
})();
