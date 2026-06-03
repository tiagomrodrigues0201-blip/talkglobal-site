(() => {
  const loadVideo = (button) => {
    const frame = button.closest("[data-video-frame]");
    const videoSrc = button.dataset.videoSrc;
    const embedUrl = button.dataset.videoEmbed;
    if (!frame || frame.dataset.loaded === "true") return;

    if (videoSrc) {
      const poster = frame.querySelector("img")?.getAttribute("src") || "";
      const video = document.createElement("video");
      video.src = videoSrc;
      video.poster = poster;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("title", button.dataset.videoTitle || "Vídeo do Arquivo HESIDIO");

      frame.textContent = "";
      frame.appendChild(video);
      frame.dataset.loaded = "true";
      return;
    }

    if (!embedUrl) return;

    const iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.title = button.dataset.videoTitle || "Vídeo do Arquivo HESIDIO";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;

    frame.textContent = "";
    frame.appendChild(iframe);
    frame.dataset.loaded = "true";
  };

  const bindVideoButtons = () => {
    document.querySelectorAll("[data-video-play]").forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => loadVideo(button));
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindVideoButtons);
  } else {
    bindVideoButtons();
  }

  document.addEventListener("hesidio:content-rendered", bindVideoButtons);
})();
