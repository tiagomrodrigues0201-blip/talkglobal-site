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
      { number: 1, date: "23/05/2026", title: "O Acidente", url: "/manga/episodios/ep-1/", status: "DISPONÍVEL" },
      { number: 2, date: "30/05/2026", title: "A Garota que Sobreviveu", url: "/manga/episodios/ep-2/", status: "DISPONÍVEL" },
      { number: 3, date: "06/06/2026", title: "Registro selado", url: "/manga/episodios/ep-3/", status: "SELADO" },
      { number: 4, date: "13/06/2026", title: "Registro selado", url: "/manga/episodios/ep-4/", status: "SELADO" },
      { number: 5, date: "20/06/2026", title: "Registro selado", url: "/manga/episodios/ep-5/", status: "SELADO" },
      { number: 6, date: "27/06/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-6/", status: "RESTRITO", premium: true },
      { number: 7, date: "04/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-7/", status: "RESTRITO", premium: true },
      { number: 8, date: "11/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-8/", status: "RESTRITO", premium: true },
      { number: 9, date: "18/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-9/", status: "RESTRITO", premium: true },
      { number: 10, date: "25/07/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-10/", status: "RESTRITO", premium: true },
      { number: 11, date: "01/08/2026", title: "Arquivo restrito", url: "/manga/episodios/ep-11/", status: "RESTRITO", premium: true }
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
