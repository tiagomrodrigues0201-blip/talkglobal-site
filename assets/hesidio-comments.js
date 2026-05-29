(() => {
  const MAX_LENGTH = 500;
  const state = {
    client: null,
    session: null,
    root: null,
    episodeSlug: ""
  };

  const selectors = {
    root: "[data-episode-comments]",
    loggedOut: "[data-comments-logged-out]",
    loggedIn: "[data-comments-logged-in]",
    form: "[data-comment-form]",
    textarea: "[data-comment-content]",
    counter: "[data-comment-counter]",
    status: "[data-comment-status]",
    list: "[data-comment-list]"
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  const getElement = (selector) => state.root?.querySelector(selector);

  function withTimeout(promise, message, timeoutMs = 12000) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  function setStatus(message, type = "neutral") {
    const status = getElement(selectors.status);
    if (!status) return;
    status.textContent = message || "";
    status.dataset.state = type;
  }

  function maskEmail(email) {
    const value = String(email || "");
    const [name, domain] = value.split("@");
    if (!name || !domain) return "Leitor reconhecido";
    return `${name.slice(0, 2)}***@${domain}`;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function setAuthUi() {
    const isLoggedIn = Boolean(state.session?.user);
    const loggedOut = getElement(selectors.loggedOut);
    const loggedIn = getElement(selectors.loggedIn);
    if (loggedOut) loggedOut.hidden = isLoggedIn;
    if (loggedIn) loggedIn.hidden = !isLoggedIn;
  }

  function updateCounter() {
    const textarea = getElement(selectors.textarea);
    const counter = getElement(selectors.counter);
    if (!textarea || !counter) return;
    const length = textarea.value.length;
    counter.textContent = `${length}/${MAX_LENGTH}`;
    counter.dataset.state = length > MAX_LENGTH ? "error" : "neutral";
  }

  function commentMarkup(comment) {
    const canDelete = state.session?.user?.id === comment.user_id;
    return `
      <article class="episode-comment">
        <header>
          <strong>${escapeHtml(maskEmail(comment.user_email))}</strong>
          <time datetime="${escapeHtml(comment.created_at)}">${escapeHtml(formatDate(comment.created_at))}</time>
        </header>
        <p>${escapeHtml(comment.content)}</p>
        ${canDelete ? `<button type="button" data-comment-delete="${escapeHtml(comment.id)}">Apagar registro</button>` : ""}
      </article>
    `;
  }

  async function loadComments() {
    if (!state.client || !state.episodeSlug) return;
    const list = getElement(selectors.list);
    if (list) {
      list.innerHTML = '<p class="comments-empty">Consultando registros do arquivo...</p>';
    }

    let data = [];
    try {
      const result = await withTimeout(
        state.client
          .from("episode_comments")
          .select("id, episode_slug, user_id, user_email, content, created_at")
          .eq("episode_slug", state.episodeSlug)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(50),
        "A consulta demorou demais. Recarregue o episódio em alguns segundos."
      );

      if (result.error) {
        if (list) list.innerHTML = '<p class="comments-empty">Os comentários ainda não estão disponíveis neste arquivo.</p>';
        setStatus(result.error.message, "error");
        return;
      }
      data = result.data || [];
    } catch (error) {
      if (list) list.innerHTML = '<p class="comments-empty">Não foi possível consultar os registros agora.</p>';
      setStatus(error.message || "Comentários indisponíveis.", "error");
      return;
    }

    if (!list) return;
    if (!data?.length) {
      list.innerHTML = '<p class="comments-empty">Nenhum registro público ainda. Seja o primeiro a comentar este episódio.</p>';
      return;
    }

    list.innerHTML = data.map(commentMarkup).join("");
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!state.client || !state.session?.user) {
      setStatus("Entre no cofre para publicar um registro.", "error");
      return;
    }

    const textarea = getElement(selectors.textarea);
    const content = textarea?.value.trim() || "";
    if (!content) {
      setStatus("O registro não pode ficar vazio.", "error");
      return;
    }
    if (content.length > MAX_LENGTH) {
      setStatus(`O limite é de ${MAX_LENGTH} caracteres.`, "error");
      return;
    }

    const submitButton = event.submitter || getElement(`${selectors.form} button[type="submit"]`);
    if (submitButton) submitButton.disabled = true;
    setStatus("Gravando registro no arquivo...", "neutral");

    let error = null;
    try {
      const result = await withTimeout(
        state.client.from("episode_comments").insert({
          episode_slug: state.episodeSlug,
          user_id: state.session.user.id,
          user_email: state.session.user.email || "",
          content
        }),
        "A gravação demorou demais. Recarregue a página e tente novamente."
      );
      error = result.error;
    } catch (caughtError) {
      error = caughtError;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }

    if (error) {
      setStatus(error.message || "Não foi possível publicar o registro.", "error");
      return;
    }

    textarea.value = "";
    updateCounter();
    setStatus("Registro publicado.", "success");
    await loadComments();
  }

  async function deleteComment(id) {
    if (!state.client || !state.session?.user || !id) return;
    setStatus("Removendo registro...", "neutral");
    let error = null;
    try {
      const result = await withTimeout(
        state.client
          .from("episode_comments")
          .delete()
          .eq("id", id),
        "A remoção demorou demais. Tente novamente em alguns segundos."
      );
      error = result.error;
    } catch (caughtError) {
      error = caughtError;
    }

    if (error) {
      setStatus(error.message || "Não foi possível remover o registro.", "error");
      return;
    }

    setStatus("Registro removido.", "success");
    await loadComments();
  }

  async function loadConfig() {
    const response = await fetch("/api/auth-config", { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    const config = contentType.includes("application/json") ? await response.json() : { configured: false };
    if (!config.configured) throw new Error("Supabase Auth ainda não está configurado.");
    return config;
  }

  async function init() {
    state.root = document.querySelector(selectors.root);
    if (!state.root) return;
    state.episodeSlug = state.root.dataset.episodeComments || "";

    getElement(selectors.textarea)?.addEventListener("input", updateCounter);
    getElement(selectors.form)?.addEventListener("submit", submitComment);
    getElement(selectors.list)?.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-comment-delete]");
      if (trigger) deleteComment(trigger.dataset.commentDelete);
    });
    updateCounter();

    if (!window.supabase?.createClient) {
      setStatus("O login ainda não carregou. Recarregue a página em alguns segundos.", "error");
      return;
    }

    try {
      const config = await loadConfig();
      state.client = window.supabase.createClient(config.supabaseUrl, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      const { data } = await state.client.auth.getSession();
      state.session = data?.session || null;
      setAuthUi();
      await loadComments();

      state.client.auth.onAuthStateChange(async (_event, session) => {
        state.session = session || null;
        setAuthUi();
        await loadComments();
      });
    } catch (error) {
      setStatus(error.message || "Comentários indisponíveis.", "error");
      setAuthUi();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
