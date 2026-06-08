(() => {
  const state = {
    currentEpisodeNumber: 10,
    currentEpisodeTitle: "Registro 10",
    currentEpisodeUrl: "/manga/episodios/ep-10/",
    currentEpisodeStatus: "DISPONÍVEL",
    seasonOneStatus: "TEMPORADA I DISPONÍVEL",
    seasonOnePublicCount: 10,
    seasonOneFinalReleaseDate: "13/06/2026",
    seasonOnePublicSummary: "10 episódios disponíveis. Os registros finais da Temporada I serão liberados em 13 de junho.",
    currentCardSlug: "airi_festival_lights",
    currentCardTitle: "Airi Kurohana — Festival de Luzes",
    currentCardCharacter: "Airi Kurohana",
    currentCardRarity: "Especial",
    currentCardWeek: 1,
    currentCardDescription: "Um presente do cofre HESIDIO. Airi Kurohana aparece em uma lembrança luminosa preservada para leitores do arquivo.",
    latestArticleTitle: "Por Que Berserk Continua Sendo o Maior Mangá Dark Fantasy Já Criado?",
    latestArticleUrl: "/artigos/por-que-berserk-continua-sendo-o-maior-dark-fantasy/",
    homeHeroImage: "/public/studios/hesidio-poster.png",
    homeHeroImageAlt: "Fragmento visual restrito de HESIDIO.",
    weeklyArticleEnabled: true,
    weeklyArticleStatus: "ARTIGO DA SEMANA",
    weeklyArticleTitle: "O Futuro dos Animes Já Está Sendo Escrito",
    weeklyArticleUrl: "/blog/o-futuro-dos-animes-ja-esta-sendo-escrito.html",
    weeklyArticleImage: "/public/blog/hesidio/artigos/futuro-dos-animes-8jun.png",
    weeklyArticleImageAlt: "Figura diante de ruínas colossais com a palavra HESIDIO gravada discretamente em uma estrutura antiga.",
    weeklyArticleSubtitle: "Kagurabachi, Centuria, Gokurakugai e The Bugle Call parecem carregar a energia dos próximos grandes fenômenos do anime.",
    featuredVideoEnabled: false,
    featuredVideoStatus: "DESTAQUE EM VÍDEO",
    featuredVideoSlug: "registro-001",
    featuredVideoTitle: "O Primeiro Despertar de Ren Hazama",
    featuredVideoUrl: "/videos/registro-001.html",
    featuredVideoImage: "/public/videos/registro-001-poster.jpg",
    featuredVideoImageAlt: "Miniatura do Registro 001 do Arquivo de Vídeos HESIDIO.",
    featuredVideoSubtitle: "Registro audiovisual preservado para futuras cenas, bastidores e fragmentos oficiais de HESIDIO.",
    nextEpisodeNumber: 11,
    nextEpisodeDate: "13/06/2026",
    episodes: [
      { number: 1, date: "23/05/2026", title: "O Acidente", url: "/manga/episodios/ep-1/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-1/images/001.png", coverAlt: "Capa do Episódio 1 de HESIDIO" },
      { number: 2, date: "30/05/2026", title: "A Garota que Sobreviveu", url: "/manga/episodios/ep-2/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-2/images/001.png", coverAlt: "Capa do Episódio 2 de HESIDIO" },
      { number: 3, date: "03/06/2026", title: "Registro 03", url: "/manga/episodios/ep-3/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-3/images/001.png", coverAlt: "Capa do Episódio 3 de HESIDIO" },
      { number: 4, date: "03/06/2026", title: "Registro 04", url: "/manga/episodios/ep-4/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-4/images/001.png", coverAlt: "Capa do Episódio 4 de HESIDIO" },
      { number: 5, date: "03/06/2026", title: "Registro 05", url: "/manga/episodios/ep-5/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-5/images/001.png", coverAlt: "Capa do Episódio 5 de HESIDIO" },
      { number: 6, date: "03/06/2026", title: "Registro 06", url: "/manga/episodios/ep-6/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-6/images/001.png", coverAlt: "Capa do Episódio 6 de HESIDIO" },
      { number: 7, date: "03/06/2026", title: "Registro 07", url: "/manga/episodios/ep-7/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-7/images/001.png", coverAlt: "Capa do Episódio 7 de HESIDIO" },
      { number: 8, date: "03/06/2026", title: "Registro 08", url: "/manga/episodios/ep-8/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-8/images/001.png", coverAlt: "Capa do Episódio 8 de HESIDIO" },
      { number: 9, date: "03/06/2026", title: "Registro 09", url: "/manga/episodios/ep-9/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-9/images/001.png", coverAlt: "Capa do Episódio 9 de HESIDIO" },
      { number: 10, date: "03/06/2026", title: "Registro 10", url: "/manga/episodios/ep-10/", status: "DISPONÍVEL", coverImage: "/public/manga/episodios/ep-10/images/001.png", coverAlt: "Capa do Episódio 10 de HESIDIO" },
      { number: 11, date: "13/06/2026", title: "Registro selado", url: "/manga/episodios/ep-11/", status: "REGISTRO SELADO", sealed: true },
      { number: 12, date: "13/06/2026", title: "Registro selado", url: "/manga/episodios/ep-12/", status: "REGISTRO SELADO", sealed: true }
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
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
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
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 1
      },
      {
        slug: "ban",
        name: "Ban",
        url: "/personagens/ban/",
        image: "/public/studios/ban.jpg",
        imageAlt: "Dossiê visual oficial de Ban em HESIDIO",
        summary: "Livre demais para obedecer ao medo.",
        fullSummary: "Livre demais para obedecer ao medo. Onde Ren é silêncio, Ban é movimento.",
        file: "BAN-03",
        signal: "VENTO",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "kiwa",
        name: "Kiwa",
        url: "/personagens/kiwa/",
        image: "/public/studios/kiwa.jpg",
        imageAlt: "Dossiê visual oficial de Kiwa em HESIDIO",
        summary: "Ela não deixa ninguém cair em silêncio.",
        fullSummary: "Ela não deixa ninguém cair em silêncio. O arquivo registra calor humano em situações críticas.",
        file: "KIW-04",
        signal: "CALOR",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "alaric",
        name: "Alaric",
        url: "/personagens/alaric/",
        image: "/public/studios/alaric.jpg",
        imageAlt: "Dossiê visual oficial de Alaric em HESIDIO",
        summary: "Ordem não é paz. É contenção.",
        fullSummary: "Ordem não é paz. É contenção. O guardião permanece entre Airi e memórias que não deveriam voltar.",
        file: "ALA-05",
        signal: "ORDEM",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "izaya",
        name: "Izaya",
        url: "/personagens/izaya/",
        image: "/public/studios/izaya.jpg",
        imageAlt: "Dossiê visual oficial de Izaya em HESIDIO",
        summary: "O medo aprendeu a sorrir.",
        fullSummary: "O medo aprendeu a sorrir. A ameaça não parece atacar apenas o corpo.",
        file: "IZA-06",
        signal: "MEDO",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "zenkai",
        name: "Zenkai",
        url: "/personagens/zenkai/",
        image: "/public/studios/zenkai.jpg",
        imageAlt: "Dossiê visual oficial de Zenkai em HESIDIO",
        summary: "Ele não quer o mundo. Quer ultrapassá-lo.",
        fullSummary: "Ele não quer o mundo. Quer ultrapassá-lo. Não há conclusão pública autorizada.",
        file: "ZEN-07",
        signal: "VAZIO",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "mizuki",
        name: "Mizuki",
        url: "/personagens/mizuki/",
        image: "/public/studios/mizuki.jpg",
        imageAlt: "Dossiê visual oficial de Mizuki em HESIDIO",
        summary: "Dossiê lacrado. Acesso público negado.",
        fullSummary: "Dossiê lacrado. O arquivo não confirma origem, função, intenção ou vínculo com eventos futuros.",
        file: "MIZ-08",
        signal: "LACRADO",
        sealLabel: "Dossiê lacrado",
        cardSeal: "DOSSIÊ LACRADO",
        episodeNumber: 10
      },
      {
        slug: "daitetsu",
        name: "Daitetsu",
        url: "/personagens/daitetsu/",
        image: "/public/studios/daitetsu.jpg",
        imageAlt: "Dossiê visual oficial de Daitetsu em HESIDIO",
        summary: "Algumas lendas ainda respiram.",
        fullSummary: "Algumas lendas ainda respiram. Daitetsu parece lembrar de coisas que o mundo tentou apagar.",
        file: "DAI-09",
        signal: "LENDÁRIO",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "pippa",
        name: "Pippa",
        url: "/personagens/pippa/",
        image: "/public/studios/pippa.jpg",
        imageAlt: "Dossiê visual oficial de Pippa em HESIDIO",
        summary: "Ainda humana. Apesar de tudo.",
        fullSummary: "Ainda humana. Apesar de tudo. Em HESIDIO, sentir pode ser mais perigoso do que qualquer poder.",
        file: "PIP-10",
        signal: "HUMANO",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "mora",
        name: "Mora",
        url: "/personagens/mora/",
        image: "/public/studios/mora.jpg",
        imageAlt: "Dossiê visual oficial de Mora em HESIDIO",
        summary: "Dossiê lacrado. Acesso público negado.",
        fullSummary: "Dossiê lacrado. O arquivo não confirma origem, função, intenção ou vínculo com eventos futuros.",
        file: "MOR-11",
        signal: "LACRADO",
        sealLabel: "Dossiê lacrado",
        cardSeal: "DOSSIÊ LACRADO",
        episodeNumber: 10
      },
      {
        slug: "hachiro",
        name: "Hachiro",
        url: "/personagens/hachiro/",
        image: "/public/studios/hachiro.jpg",
        imageAlt: "Dossiê visual oficial de Hachiro em HESIDIO",
        summary: "O nome apareceu antes da explicação.",
        fullSummary: "O nome apareceu antes da explicação. O arquivo registra disciplina, leitura de combate e silêncio calculado.",
        file: "HAC-12",
        signal: "DISCIPLINA",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "sakuma",
        name: "Sakuma",
        url: "/personagens/sakuma/",
        image: "/public/studios/sakuma.jpg",
        imageAlt: "Dossiê visual oficial de Sakuma em HESIDIO",
        summary: "Ele não precisava tocar em ninguém.",
        fullSummary: "Ele não precisava tocar em ninguém. O ambiente reage antes dele.",
        file: "SAK-13",
        signal: "PRESSÃO",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
      },
      {
        slug: "bakurai",
        name: "Bakurai",
        url: "/personagens/bakurai/",
        image: "/public/studios/bakurai.jpg",
        imageAlt: "Dossiê visual oficial de Bakurai em HESIDIO",
        summary: "Se o corpo quebrar, ele avança quebrado.",
        fullSummary: "Se o corpo quebrar, ele avança quebrado. O arquivo registra ruptura elétrica instável.",
        file: "BAK-14",
        signal: "RUPTURA",
        sealLabel: "Arquivo público",
        cardSeal: "DOSSIÊ LIBERADO",
        episodeNumber: 10
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
    currentEpisodeButtonText: () => "Começar leitura",
    currentEpisodeSummary: () => state.seasonOnePublicSummary,
    currentEpisodeCardTitle: () => `${computed.currentEpisodeLabel()} — ${state.currentEpisodeTitle}`,
    currentEpisodeCardCopy: () => "Os primeiros 10 episódios da Temporada I estão abertos para leitura pública.",
    currentEpisodeMetaDescription: () => `Portal oficial de HESIDIO. ${state.seasonOnePublicSummary} Leia a Temporada I no arquivo oficial.`,
    nextEpisodeLabel: () => `EP ${padEpisode(state.nextEpisodeNumber)}`,
    nextEpisodeSummary: () => {
      const episode = nextEpisode();
      return episode ? `Registros finais selados até ${state.seasonOneFinalReleaseDate}.` : "Registros finais com data a confirmar.";
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
    return "Registro selado";
  };

  const episodeDateLabel = (episode) => {
    if (episode.number <= state.currentEpisodeNumber) return "LIBERADO";
    return episode.date;
  };

  const episodeCopy = (episode) => {
    if (episode.number <= state.currentEpisodeNumber) return "Registro público aberto.";
    return `Os registros finais da Temporada I ainda permanecem selados. A abertura oficial ocorrerá em ${state.seasonOneFinalReleaseDate}.`;
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
          <article class="character-open character-open--${escapeHtml(character.slug.split("-")[0])}">
            <a href="${escapeHtml(character.url)}">
              <div class="portrait forbidden-image wm-subtle" data-src="${escapeHtml(character.image)}" data-label="${escapeHtml(character.cardSeal || "DOSSIÊ LIBERADO")}" style="--image: url('${escapeHtml(character.image)}')"><span class="image-mark">HESIDIO</span><span class="diagonal-mark" aria-hidden="true">HESIDIO</span><span class="pattern-mark" aria-hidden="true">HESIDIO · @hesidio</span></div>
              <small>${escapeHtml(character.sealLabel || "Arquivo público")}</small>
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
            <small>${escapeHtml(character.sealLabel || "Arquivo público")}</small>
            <h3>${escapeHtml(character.name)}</h3>
            <p>${escapeHtml(character.fullSummary)}</p>
          </article>
        `;
      }

      return `
        <a class="hub-character-card hub-character-card--${escapeHtml(character.slug.split("-")[0])}" href="${escapeHtml(character.url)}">
          <figure class="watermarked-image watermarked-image--page watermarked-image--soft-center" oncontextmenu="return false">
            <img src="${escapeHtml(character.image)}" alt="${escapeHtml(character.imageAlt)}" draggable="false" loading="lazy" decoding="async">
            <span class="watermarked-image__center" aria-hidden="true">${escapeHtml(character.cardSeal || "DOSSIÊ LIBERADO")}</span>
            <span class="watermarked-image__pattern" aria-hidden="true">HESIDIO · @hesidio</span>
            <span class="watermarked-image__diagonal" aria-hidden="true">HESIDIO</span>
            <span class="watermarked-image__corner" aria-hidden="true"><strong>HESIDIO</strong><small>@hesidio</small></span>
          </figure>
          <small>${escapeHtml(character.sealLabel || "Arquivo público")}</small>
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
              <a href="/personagens/">Personagens</a>
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
            <a href="/personagens/"><span>Personagens</span><strong>Dossiês públicos</strong></a>
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
