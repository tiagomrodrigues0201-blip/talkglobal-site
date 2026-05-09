(() => {
  const MAX_FREE_BYTES = 50 * 1024 * 1024;
  const MAX_FREE_SECONDS = 90;
  const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm'];
  const languages = { auto: 'Detectado automaticamente', pt: 'Português', en: 'Inglês', es: 'Espanhol', fr: 'Francês', it: 'Italiano', de: 'Alemão', ja: 'Japonês', ko: 'Coreano' };
  const statusLabels = {
    created: 'Job criado. Enviando vídeo direto para o Supabase Storage...',
    uploaded: 'Upload concluído. Preparando processamento...',
    transcribing: 'Transcrevendo o áudio com IA...',
    translating: 'Traduzindo com contexto e naturalidade...',
    generating_srt: 'Gerando SRT sincronizado...',
    rendering: 'Aplicando legendas e watermark no MP4...',
    completed: 'Tradução concluída.',
    failed: 'O processamento falhou.'
  };
  const statusOrder = ['created', 'uploaded', 'transcribing', 'translating', 'generating_srt', 'rendering', 'completed'];

  let currentFile = null;
  let currentObjectUrl = '';
  let selectedPlan = 'free';
  let currentDuration = 0;
  let currentJobId = '';
  let currentSrt = '';
  let currentVideoUrl = '';
  let currentSrtUrl = '';
  let pollTimer = null;
  let reuseSourceJobId = '';
  let reuseMode = '';
  let lastResultMeta = null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const form = $('[data-form]');
  const fileInput = $('#videoFile');
  const dropzone = $('[data-dropzone]');
  const preview = $('[data-preview]');
  const results = $('[data-results]');
  const generateButton = $('.generate');

  function setRealStatus(status, message) {
    const index = Math.max(0, statusOrder.indexOf(status));
    const percent = status === 'failed' ? 100 : Math.round(((index + 1) / statusOrder.length) * 100);
    $('[data-percent]').textContent = status || 'Status real';
    $('[data-stage]').textContent = message || statusLabels[status] || 'Processando...';
    $('[data-stage]').style.color = status === 'failed' ? 'var(--danger)' : '';
    $('[data-progress]').style.width = status === 'failed' ? '100%' : `${percent}%`;
    $$('[data-step]').forEach((step) => {
      const key = step.dataset.step;
      const stepIndex = statusOrder.indexOf(key);
      step.classList.toggle('active', key === status);
      step.classList.toggle('done', stepIndex >= 0 && stepIndex < index);
      if (status === 'completed') step.classList.add('done');
    });
  }

  function showError(message) {
    setNotice(message, 'error');
    setRealStatus('failed', message);
    generateButton.disabled = false;
    generateButton.textContent = 'Gerar tradução';
  }


  function setNotice(message, type = 'info') {
    let notice = document.querySelector('[data-action-notice]');
    if (!notice) {
      notice = document.createElement('div');
      notice.dataset.actionNotice = 'true';
      notice.className = 'action-notice';
      form.insertAdjacentElement('beforebegin', notice);
    }
    notice.textContent = message || '';
    notice.hidden = !message;
    notice.classList.toggle('error', type === 'error');
  }

  function showComingSoon(feature) {
    window.alert('Essa função estará disponível em breve.');
    setNotice(`${feature} estará disponível em breve. Assim que entrar, o botão já vai gerar o arquivo final automaticamente.`, 'info');
    setRealStatus('completed', `${feature} estará disponível em breve.`);
  }

  function prepareReuse(mode) {
    if (!currentJobId) return showError('Gere uma tradução primeiro para reaproveitar o vídeo original.');
    reuseSourceJobId = currentJobId;
    reuseMode = mode;
    results.hidden = true;
    setNotice(mode === 'language'
      ? 'Escolha o novo idioma final e clique em Gerar tradução. O mesmo vídeo original será reaproveitado.'
      : 'Escolha outro estilo de legenda e clique em Gerar tradução. O mesmo vídeo original será reaproveitado.', 'info');
    setRealStatus('uploaded', mode === 'language' ? 'Vídeo original preservado. Escolha outro idioma.' : 'Vídeo original preservado. Escolha outro estilo.');
    generateButton.disabled = false;
    generateButton.textContent = mode === 'language' ? 'Gerar novo idioma' : 'Gerar novo estilo';
    if (mode === 'language') $('#targetLanguage').focus();
    else document.querySelector('input[name="captionStyle"]:not(:checked)')?.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function formatSize(bytes) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  }

  function formatDuration(seconds) {
    if (!seconds || Number.isNaN(seconds)) return 'duração não detectada';
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  function validateFile(file) {
    if (!file) return 'Selecione um vídeo para continuar.';
    if (!ACCEPTED.includes(file.type)) return 'Formato não aceito. Use MP4, MOV ou WEBM.';
    if (selectedPlan === 'free' && file.size > MAX_FREE_BYTES) return 'No plano grátis, use vídeos de até 50 MB nesta fase.';
    return '';
  }

  function previewFile(file) {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);
    preview.innerHTML = `<video src="${currentObjectUrl}" controls playsinline></video><div class="watermark">Translated with TalkGlobal AI</div><div class="live-caption" data-live-caption>O resultado real aparecerá após o processamento.</div>`;
    const video = preview.querySelector('video');
    video.addEventListener('loadedmetadata', () => {
      currentDuration = video.duration || 0;
      if (selectedPlan === 'free' && currentDuration > MAX_FREE_SECONDS) {
        showError('No plano grátis, use vídeos de até 90 segundos nesta primeira versão.');
      } else {
        setRealStatus('created', `Arquivo pronto: ${formatSize(file.size)} • ${formatDuration(currentDuration)}`);
      }
    });
  }

  function applyCaptionStyle(style) {
    const caption = $('[data-live-caption]');
    if (!caption) return;
    caption.className = 'live-caption';
    if (style === 'TikTok Bold') caption.classList.add('tiktok');
    if (style === 'Cinema') caption.classList.add('cinema');
    if (style === 'Anime') caption.classList.add('anime');
    if (style === 'Minimal') caption.classList.add('minimal');
  }

  function renderFinalVideoPreview(videoUrl, firstCaptionStart = 0, firstCaptionText = '') {
    preview.innerHTML = `
      <video src="${videoUrl}" controls playsinline preload="metadata" data-final-video></video>
      <div class="final-badge">MP4 final renderizado</div>
      <div class="preview-proof">Pulando para a primeira legenda: ${firstCaptionText ? firstCaptionText.replace(/[<>&]/g, '') : 'legenda gerada'}</div>
    `;
    const video = preview.querySelector('[data-final-video]');
    video.addEventListener('loadedmetadata', () => {
      const target = Math.max(0, Number(firstCaptionStart || 0) + 0.12);
      video.currentTime = Math.min(target, Math.max(0, (video.duration || target + 1) - 0.25));
    }, { once: true });
  }

  function getFormValues() {
    return {
      sourceLanguage: $('#sourceLanguage').value,
      targetLanguage: $('#targetLanguage').value,
      captionStyle: document.querySelector('input[name="captionStyle"]:checked')?.value || 'Clean',
      plan: selectedPlan
    };
  }

  async function createJob(data) {
    const response = await fetch('/api/translate-video?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: currentFile.name,
        fileSize: currentFile.size,
        fileType: currentFile.type,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        captionStyle: data.captionStyle,
        plan: selectedPlan
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Não foi possível criar o job.');
    if (!json.upload?.supabaseUrl || !json.upload?.anonKey || !json.upload?.token) throw new Error('Backend não retornou dados de upload direto.');
    return json;
  }

  async function uploadDirectToSupabase(job) {
    if (!window.supabase?.createClient) throw new Error('Cliente Supabase não carregou no navegador.');
    setRealStatus('created', 'Enviando vídeo direto para o Supabase Storage...');
    const client = window.supabase.createClient(job.upload.supabaseUrl, job.upload.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error } = await client.storage
      .from(job.upload.bucket)
      .uploadToSignedUrl(job.upload.path || job.storagePath, job.upload.token, currentFile, {
        contentType: currentFile.type,
        upsert: true
      });
    if (error) throw new Error(`Erro no upload direto para Supabase: ${error.message}`);
    setRealStatus('uploaded', 'Upload direto concluído. Iniciando processamento...');
  }

  async function startJob(jobId, data) {
    const response = await fetch('/api/translate-video?action=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, ...data, plan: selectedPlan })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Erro ao iniciar processamento.');
    return json;
  }


  async function cloneJob(sourceJobId, data) {
    const response = await fetch('/api/translate-video?action=clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceJobId, ...data, plan: selectedPlan })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Erro ao criar novo processamento com o mesmo vídeo.');
    return json;
  }

  async function pollJob(jobId) {
    const response = await fetch(`/api/translate-video?jobId=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Não foi possível consultar o job.');
    setRealStatus(json.status, json.error || statusLabels[json.status]);
    if (json.status === 'completed') {
      clearInterval(pollTimer);
      renderResult(json);
    }
    if (json.status === 'failed') {
      clearInterval(pollTimer);
      showError(json.error || 'O processamento falhou.');
    }
  }

  function startPolling(jobId) {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => pollJob(jobId).catch((error) => showError(error.message)), 1800);
  }

  function renderResult(data) {
    currentSrt = data.srt || currentSrt;
    currentVideoUrl = data.videoUrl || '';
    currentSrtUrl = data.srtUrl || '';
    lastResultMeta = data;
    if (!currentVideoUrl || !currentSrtUrl) {
      showError('Arquivos finais ainda não estão disponíveis. Gere novamente ou aguarde o processamento concluir.');
      return;
    }
    $('[data-file-name]').textContent = currentFile?.name || data.fileName || 'video.mp4';
    $('[data-file-meta]').textContent = `${currentFile ? formatSize(currentFile.size) : 'vídeo reaproveitado'} • ${currentDuration ? formatDuration(currentDuration) : 'processado'} • ${selectedPlan}`;
    $('[data-target-label]').textContent = languages[$('#targetLanguage').value] || $('#targetLanguage').value;
    $('[data-style-label]').textContent = `Legenda ${document.querySelector('input[name="captionStyle"]:checked')?.value || 'Clean'}`;
    $('[data-watermark]').textContent = selectedPlan === 'free' ? 'Translated with TalkGlobal AI' : 'Sem watermark no premium';
    $('[data-srt-preview]').textContent = currentSrt || 'SRT gerado. Use o botão de download para baixar.';
    renderFinalVideoPreview(currentVideoUrl, data.firstCaptionStart || 0, data.firstCaptionText || '');
    results.hidden = false;
    generateButton.disabled = false;
    generateButton.textContent = 'Gerar tradução';
    preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openDownload(url, label) {
    if (!url) return showError(`${label} ainda não está disponível.`);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.rel = 'noopener';
    a.click();
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const error = validateFile(file);
    if (error) return showError(error);
    currentFile = file;
    currentJobId = '';
    currentSrt = '';
    currentVideoUrl = '';
    currentSrtUrl = '';
    results.hidden = true;
    reuseSourceJobId = '';
    reuseMode = '';
    setNotice('');
    previewFile(file);
  });

  ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragging');
  }));
  dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event('change'));
  });

  $$('[data-plan]').forEach((button) => button.addEventListener('click', () => {
    selectedPlan = button.dataset.plan;
    $$('[data-plan]').forEach((b) => b.classList.toggle('active', b === button));
    if (currentFile) previewFile(currentFile);
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = getFormValues();
    try {
      generateButton.disabled = true;
      generateButton.textContent = 'Processando...';
      setNotice('');

      if (reuseSourceJobId) {
        setRealStatus('uploaded', reuseMode === 'language' ? 'Criando nova tradução com o mesmo vídeo...' : 'Criando novo estilo com o mesmo vídeo...');
        const job = await cloneJob(reuseSourceJobId, data);
        currentJobId = job.jobId;
        reuseSourceJobId = '';
        reuseMode = '';
        startPolling(currentJobId);
        generateButton.textContent = 'Processando no worker...';
        if (job.queued || job.status === 'uploaded') return;
        clearInterval(pollTimer);
        setRealStatus(job.status, statusLabels[job.status]);
        renderResult(job);
        return;
      }

      const error = validateFile(currentFile);
      if (error) return showError(error);
      if (selectedPlan === 'free' && currentDuration > MAX_FREE_SECONDS) return showError('No plano grátis, use vídeos de até 90 segundos nesta primeira versão.');
      setRealStatus('created', 'Criando job no backend...');
      const job = await createJob(data);
      currentJobId = job.jobId;
      startPolling(currentJobId);
      await uploadDirectToSupabase(job);
      const result = await startJob(currentJobId, data);
      if (result.queued || result.status === 'uploaded') {
        setRealStatus('uploaded', result.message || statusLabels.uploaded);
        generateButton.textContent = 'Processando no worker...';
        return;
      }
      clearInterval(pollTimer);
      setRealStatus(result.status, statusLabels[result.status]);
      renderResult(result);
    } catch (error) {
      clearInterval(pollTimer);
      showError(error.message);
    }
  });

  $('[data-download-srt]').addEventListener('click', () => openDownload(currentSrtUrl, 'SRT real'));
  $('[data-download-mp4]').addEventListener('click', () => openDownload(currentVideoUrl, 'MP4 legendado'));
  $('[data-open-debug]').addEventListener('click', () => {
    if (!currentJobId) return showError('Job ainda não disponível. Gere uma tradução primeiro.');
    window.open(`/api/translate-video?action=debug&jobId=${encodeURIComponent(currentJobId)}`, '_blank', 'noopener');
  });
  $('[data-copy-srt]').addEventListener('click', async () => {
    await navigator.clipboard.writeText(currentSrt || $('[data-srt-preview]').textContent || '');
    $('[data-copy-srt]').textContent = 'Copiado';
    setTimeout(() => { $('[data-copy-srt]').textContent = 'Copiar'; }, 1400);
  });
  $('[data-another-language]').addEventListener('click', () => prepareReuse('language'));
  $('[data-another-style]').addEventListener('click', () => prepareReuse('style'));
  $$('[data-short]').forEach((button) => button.addEventListener('click', () => {
    showComingSoon(button.dataset.short === 'tiktok' ? 'Criar versão TikTok/Reels' : 'Criar versão YouTube Shorts');
  }));
})();
