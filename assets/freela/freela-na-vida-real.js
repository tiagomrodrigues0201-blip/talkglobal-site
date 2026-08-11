const checkoutButtons = document.querySelectorAll("[data-checkout='freela-na-vida-real']");
const statusEl = document.querySelector("[data-checkout-status]");

function setCheckoutStatus(message) {
  if (statusEl) statusEl.textContent = message;
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
