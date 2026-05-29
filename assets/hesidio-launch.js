(() => {
  const status = document.querySelector("[data-launch-status]");
  const readButtons = document.querySelectorAll("[data-episode-one-link]");
  const checkoutButtons = document.querySelectorAll("[data-hesidio-checkout]");
  const siteState = window.HESIDIO_SITE_STATE;

  if (siteState) {
    if (status) status.textContent = siteState.getValue("currentEpisodeStatusLabel");
    readButtons.forEach((button) => {
      button.textContent = siteState.getValue("currentEpisodeButtonText");
      button.setAttribute("href", siteState.currentEpisodeUrl);
    });
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

})();
