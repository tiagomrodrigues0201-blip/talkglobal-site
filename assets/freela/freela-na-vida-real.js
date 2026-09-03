const checkoutButtons = document.querySelectorAll("[data-checkout='freela-na-vida-real']");
const statusEl = document.querySelector("[data-checkout-status]");
const productItem = {
  item_id: "freela-na-vida-real",
  item_name: "Freela na Vida Real",
  quantity: 1
};

function setCheckoutStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function trackCheckoutAndRedirect(checkout) {
  let redirected = false;
  const redirect = () => {
    if (redirected) return;
    redirected = true;
    window.location.assign(checkout.url);
  };

  if (typeof window.gtag !== "function") {
    redirect();
    return;
  }

  const value = Number(checkout.value) || 14.99;
  const currency = String(checkout.currency || "BRL").toUpperCase();

  window.gtag("event", "begin_checkout", {
    currency,
    value,
    items: [{ ...productItem, price: value }],
    event_callback: redirect,
    event_timeout: 1000
  });

  window.setTimeout(redirect, 1200);
}

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
        setCheckoutStatus("Abrindo o pagamento seguro...");
        trackCheckoutAndRedirect(data);
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
