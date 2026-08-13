const checkoutButtons = document.querySelectorAll("[data-checkout='freela-na-vida-real']");
const statusEl = document.querySelector("[data-checkout-status]");
const pixToggle = document.querySelector("[data-pix-toggle]");
const pixBox = document.querySelector("[data-pix-box]");
const pixEmail = document.querySelector("[data-pix-email]");
const pixCreate = document.querySelector("[data-pix-create]");
const pixPayment = document.querySelector("[data-pix-payment]");
const pixQr = document.querySelector("[data-pix-qr]");
const pixCodeWrap = document.querySelector("[data-pix-code-wrap]");
const pixCode = document.querySelector("[data-pix-code]");
const pixCopy = document.querySelector("[data-pix-copy]");

let pixStatusTimer = 0;
let activePixPaymentId = "";

function setCheckoutStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function setBusy(element, busy) {
  if (!element) return;
  if (busy) element.setAttribute("aria-busy", "true");
  else element.removeAttribute("aria-busy");
}

function stopPixPolling() {
  if (pixStatusTimer) window.clearTimeout(pixStatusTimer);
  pixStatusTimer = 0;
}

function resetPixVisual() {
  if (pixPayment) pixPayment.hidden = true;
  if (pixQr) {
    pixQr.hidden = true;
    pixQr.removeAttribute("src");
  }
  if (pixCodeWrap) pixCodeWrap.hidden = true;
  if (pixCode) pixCode.value = "";
  if (pixCopy) pixCopy.hidden = true;
  pixPayment?.querySelector("[data-pix-download]")?.remove();
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = reject;
    image.src = src;
  });
}

async function showPixQr(qrCodeBase64, qrCode) {
  const qrSrc = `data:image/png;base64,${qrCodeBase64}`;
  await preloadImage(qrSrc);

  if (pixPayment) pixPayment.hidden = false;
  if (pixQr) {
    pixQr.src = qrSrc;
    pixQr.hidden = false;
  }
  if (pixCodeWrap) pixCodeWrap.hidden = false;
  if (pixCode) pixCode.value = qrCode;
  if (pixCopy) pixCopy.hidden = false;
}

async function copyPixCode() {
  const code = pixCode?.value || "";
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    setCheckoutStatus("Código Pix copiado.");
  } catch {
    pixCode?.select();
    setCheckoutStatus("Copie o código Pix selecionado.");
  }
}

function showDownloadLink(downloadUrl) {
  stopPixPolling();
  if (!pixPayment || !downloadUrl) return;
  let link = pixPayment.querySelector("[data-pix-download]");
  if (!link) {
    link = document.createElement("a");
    link.className = "freela-button freela-button-dark freela-pix-download";
    link.dataset.pixDownload = "true";
    link.textContent = "Baixar kit completo";
    pixPayment.appendChild(link);
  }
  link.href = downloadUrl;
  setCheckoutStatus("Pagamento aprovado. Seu acesso está liberado.");
}

async function pollPixStatus(paymentId) {
  if (!paymentId) return;
  try {
    const response = await fetch(`/api/freela-pix-status?payment_id=${encodeURIComponent(paymentId)}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.approved && data.download_url) {
      showDownloadLink(data.download_url);
      return;
    }
    if (response.ok && data.status === "rejected") {
      stopPixPolling();
      setCheckoutStatus("O Pix não foi aprovado. Gere uma nova cobrança para tentar novamente.");
      return;
    }
    setCheckoutStatus("Aguardando pagamento Pix...");
  } catch {
    setCheckoutStatus("Ainda não foi possível confirmar o Pix. Tentando novamente...");
  }
  pixStatusTimer = window.setTimeout(() => pollPixStatus(paymentId), 5000);
}

async function createPixPayment() {
  const email = (pixEmail?.value || "").trim();
  if (!email) {
    pixEmail?.focus();
    setCheckoutStatus("Informe seu e-mail para gerar o Pix.");
    return;
  }

  stopPixPolling();
  setBusy(pixCreate, true);
  setCheckoutStatus("Gerando Pix seguro...");

  try {
    const response = await fetch("/api/freela-pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: "freela-na-vida-real", email })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.payment_id || !data.qr_code || !data.qr_code_base64) {
      resetPixVisual();
      setCheckoutStatus(data.message || "Não foi possível gerar o Pix agora.");
      return;
    }

    activePixPaymentId = data.payment_id;
    await showPixQr(data.qr_code_base64, data.qr_code);
    setCheckoutStatus("Aguardando pagamento Pix...");
    pollPixStatus(activePixPaymentId);
  } catch {
    resetPixVisual();
    setCheckoutStatus("Não foi possível gerar o Pix agora.");
  } finally {
    setBusy(pixCreate, false);
  }
}

checkoutButtons.forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    stopPixPolling();
    setCheckoutStatus("Preparando pagamento com cartão...");
    setBusy(button, true);

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
      setBusy(button, false);
    }
  });
});

pixToggle?.addEventListener("click", () => {
  if (!pixBox) return;
  pixBox.hidden = !pixBox.hidden;
  if (!pixBox.hidden) {
    resetPixVisual();
    pixEmail?.focus();
    setCheckoutStatus("Informe seu e-mail para gerar o QR Code Pix.");
  }
});

pixCreate?.addEventListener("click", createPixPayment);
pixCopy?.addEventListener("click", copyPixCode);
