const checkoutButtons = document.querySelectorAll("[data-checkout='freela-na-vida-real']");
const statusEl = document.querySelector("[data-checkout-status]");

const launchOffer = {
  launchEndsAt: null,
  launchPrice: "R$14,99",
  regularPrice: "R$57,00"
};

function setCheckoutStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function updateCountdown() {
  const countdowns = document.querySelectorAll("[data-countdown]");
  const currentPriceEls = document.querySelectorAll("[data-current-price]");
  const regularPriceEls = document.querySelectorAll("[data-regular-price]");

  if (!launchOffer.launchEndsAt) {
    currentPriceEls.forEach((el) => {
      el.textContent = el.closest(".freela-price") ? launchOffer.launchPrice.replace("R$", "") : launchOffer.launchPrice;
    });
    regularPriceEls.forEach((el) => {
      el.textContent = launchOffer.regularPrice;
    });
    countdowns.forEach((countdown) => {
      countdown.dataset.state = "inactive";
      countdown.querySelector("[data-countdown-label]").textContent = "Liberação em breve";
    });
    return;
  }

  const endsAt = new Date(launchOffer.launchEndsAt).getTime();
  const now = Date.now();
  const remaining = Math.max(0, endsAt - now);
  const expired = remaining === 0;
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  countdowns.forEach((countdown) => {
    countdown.dataset.state = expired ? "expired" : "active";
    countdown.querySelector("[data-countdown-label]").textContent = expired ? "Oferta de lançamento encerrada" : "Oferta termina em";
    countdown.querySelector("[data-countdown-days]").textContent = String(days).padStart(2, "0");
    countdown.querySelector("[data-countdown-hours]").textContent = String(hours).padStart(2, "0");
    countdown.querySelector("[data-countdown-minutes]").textContent = String(minutes).padStart(2, "0");
    countdown.querySelector("[data-countdown-seconds]").textContent = String(seconds).padStart(2, "0");
  });

  currentPriceEls.forEach((el) => {
    const price = expired ? launchOffer.regularPrice : launchOffer.launchPrice;
    el.textContent = el.closest(".freela-price") ? price.replace("R$", "") : price;
  });
  regularPriceEls.forEach((el) => {
    el.textContent = launchOffer.regularPrice;
  });
  document.body.classList.toggle("freela-offer-expired", expired);
}

updateCountdown();
setInterval(updateCountdown, 1000);

checkoutButtons.forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    setCheckoutStatus("Preparando seu acesso...");
    button.setAttribute("aria-busy", "true");

    try {
      const response = await fetch("/api/freela-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "freela-na-vida-real" })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      const fallback = data.message || "A compra ainda não está ativa. Estamos preparando a liberação com segurança.";
      setCheckoutStatus(fallback);
      document.querySelector("#comprar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setCheckoutStatus("A compra ainda não está ativa. Volte em breve para garantir seu acesso.");
    } finally {
      button.removeAttribute("aria-busy");
    }
  });
});
