(() => {
  const storageKey = 'talkglobal_cookie_consent_v1';

  try {
    if (window.localStorage.getItem(storageKey) === 'accepted') return;
  } catch {}

  const banner = document.createElement('aside');
  banner.className = 'cookie-consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Consentimento de cookies');
  banner.innerHTML = `
    <p>Este site utiliza cookies para melhorar sua experiência, analisar tráfego e oferecer conteúdo mais relevante.</p>
    <div class="cookie-consent__actions">
      <button class="button primary" type="button">Aceitar</button>
    </div>
  `;

  const button = banner.querySelector('button');
  button.addEventListener('click', () => {
    try {
      window.localStorage.setItem(storageKey, 'accepted');
    } catch {}
    banner.hidden = true;
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(banner);
  });
})();
