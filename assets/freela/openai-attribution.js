(() => {
  const key = 'talkglobal_openai_ads_session_v1';
  const maxAge = 24 * 60 * 60 * 1000; // Our privacy limit, not an OpenAI cookie default.
  const valid = value => typeof value === 'string' && value.length > 0 && value.length <= 4000 && !/[\x00-\x20\x7f]/.test(value);
  const incoming = new URLSearchParams(location.search).get('oppref');
  const box = document.querySelector('[data-openai-ads-consent]');
  let state = null;
  const clear = () => { state = null; try { sessionStorage.removeItem(key); } catch {} };
  const restricted = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved?.consent === true && Number.isFinite(saved.at) && Date.now() - saved.at >= 0 && Date.now() - saved.at < maxAge) state = saved;
    else clear();
  } catch { clear(); }
  if (restricted()) clear();
  if (box) {
    box.checked = Boolean(state);
    box.disabled = restricted();
  }
  const save = () => {
    if (!box?.checked || restricted()) { clear(); return; }
    state = { consent: true, at: Date.now(), ...(valid(incoming) ? { oppref: incoming } : valid(state?.oppref) ? { oppref: state.oppref } : {}) };
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {}
  };
  if (state && valid(incoming)) save();
  box?.addEventListener('change', save);
  window.talkglobalOpenAIAttribution = () => {
    if (!box?.checked || restricted() || !state || Date.now() - state.at >= maxAge) { clear(); return {}; }
    return { consent: true, ...(valid(state.oppref) ? { oppref: state.oppref } : {}) };
  };
})();
