(function () {
  const data = window.TALKGLOBAL_PORTFOLIO || { covers: [], videos: [] };

  function createVideoShell(item, compact) {
    const shell = document.createElement("div");
    shell.className = compact ? "video-shell video-shell-compact" : "video-shell";

    const button = document.createElement("button");
    button.className = "video-load";
    button.type = "button";
    button.setAttribute("aria-label", `Carregar vídeo: ${item.title}`);

    const image = document.createElement("img");
    image.src = item.thumbnail;
    image.alt = `Thumbnail do vídeo ${item.title}`;
    image.loading = "lazy";

    const play = document.createElement("span");
    play.className = "play-dot";
    play.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "video-load-label";
    label.textContent = "Assistir";

    button.append(image, play, label);
    shell.append(button);

    button.addEventListener("click", () => {
      const video = document.createElement("video");
      video.src = item.video;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.poster = item.thumbnail;
      video.setAttribute("aria-label", item.title);
      shell.replaceChildren(video);
      video.focus();
      video.play().catch(() => {});
    }, { once: true });

    return shell;
  }

  function renderCovers() {
    const gallery = document.querySelector("[data-cover-gallery]");
    if (!gallery) return;

    gallery.replaceChildren(...data.covers.map((item) => {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = item.alt;
      image.loading = "lazy";
      const caption = document.createElement("figcaption");
      const title = document.createElement("strong");
      const description = document.createElement("span");
      title.textContent = item.title;
      description.textContent = item.description;
      caption.append(title, description);
      figure.append(image, caption);
      return figure;
    }));
  }

  function renderVideos() {
    const gallery = document.querySelector("[data-video-gallery]");
    if (!gallery) return;

    gallery.replaceChildren(...data.videos.map((item) => {
      const article = document.createElement("article");
      article.append(createVideoShell(item, false));

      const title = document.createElement("strong");
      title.textContent = item.title;

      const description = document.createElement("p");
      description.textContent = item.description;

      const context = document.createElement("p");
      context.className = "video-context";
      context.textContent = item.context;

      article.append(title, description, context);
      return article;
    }));
  }

  function renderHesidioVideos() {
    const gallery = document.querySelector("[data-hesidio-video-gallery]");
    if (!gallery) return;

    const videos = data.hesidioVideos || [];
    gallery.replaceChildren(...videos.map((item) => {
      const article = document.createElement("article");
      article.className = "hesidio-video-card";
      article.append(createVideoShell(item, false));

      const body = document.createElement("div");
      body.className = "hesidio-video-card-copy";

      const label = document.createElement("span");
      label.textContent = "Arquivo HESIDIO";

      const title = document.createElement("strong");
      title.textContent = item.title;

      const description = document.createElement("p");
      description.textContent = item.description;

      const context = document.createElement("p");
      context.className = "video-context";
      context.textContent = item.context;

      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = "Abrir registro";

      body.append(label, title, description, context, link);
      article.append(body);
      return article;
    }));
  }

  function renderFeaturedVideo() {
    const target = document.querySelector("[data-featured-video]");
    if (!target) return;

    const featured =
      data.videos.find((item) => item.id === data.featuredVideoId) ||
      data.videos.find((item) => item.featured) ||
      data.videos[0];

    if (featured) {
      target.replaceChildren(createVideoShell(featured, true));
    }
  }

  renderCovers();
  renderVideos();
  renderHesidioVideos();
  renderFeaturedVideo();
})();
