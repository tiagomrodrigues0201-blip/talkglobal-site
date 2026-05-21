(() => {
  const launchAt = new Date("2026-05-23T00:00:00-03:00").getTime();
  const countdown = document.querySelector("[data-countdown]");
  const status = document.querySelector("[data-launch-status]");
  const readButtons = document.querySelectorAll("[data-episode-one-link]");
  const checkoutButtons = document.querySelectorAll("[data-hesidio-checkout]");

  function pad(value) {
    return String(Math.max(0, value)).padStart(2, "0");
  }

  function tick() {
    const distance = launchAt - Date.now();
    if (!countdown || !status) return;

    if (distance <= 0) {
      countdown.textContent = "EPISÓDIO 1 DISPONÍVEL";
      status.textContent = "EPISÓDIO 1 DISPONÍVEL";
      readButtons.forEach((button) => {
        button.textContent = "Ler Episódio 1";
        button.setAttribute("href", "/manga/episodios/ep-1/");
      });
      return;
    }

    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);
    countdown.textContent = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}min ${pad(seconds)}s`;
  }

  checkoutButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const checkoutUrl = button.dataset.checkoutUrl || window.HESIDIO_STRIPE_CHECKOUT_URL || "";
      if (checkoutUrl) {
        button.setAttribute("href", checkoutUrl);
        return;
      }

      event.preventDefault();
      const fallback = button.dataset.fallbackUrl || "https://discord.gg/cZb3ktnmc";
      const message = button.nextElementSibling;
      if (message && message.matches("[data-checkout-message]")) {
        message.textContent = "Checkout premium em preparação. Entre no Discord para receber o acesso assim que o arquivo abrir.";
      }
      window.open(fallback, "_blank", "noopener");
    });
  });

  tick();
  setInterval(tick, 1000);
})();
