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
    setRealStatus('failed', message);
    generateButton.disabled = false;
    generateButton.textContent = 'Gerar tradução';
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
    if (!currentVideoUrl || !currentSrtUrl) {
      showError('Arquivos finais ainda não estão disponíveis. Gere novamente ou aguarde o processamento concluir.');
      return;
    }
    $('[data-file-name]').textContent = currentFile?.name || 'video.mp4';
    $('[data-file-meta]').textContent = `${currentFile ? formatSize(currentFile.size) : ''} • ${formatDuration(currentDuration)} • ${selectedPlan}`;
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
    const error = validateFile(currentFile);
    if (error) return showError(error);
    if (selectedPlan === 'free' && currentDuration > MAX_FREE_SECONDS) return showError('No plano grátis, use vídeos de até 90 segundos nesta primeira versão.');
    const data = getFormValues();
    try {
      generateButton.disabled = true;
      generateButton.textContent = 'Processando...';
      setRealStatus('created', 'Criando job no backend...');
      const job = await createJob(data);
      currentJobId = job.jobId;
      startPolling(currentJobId);
      await uploadDirectToSupabase(job);
      const result = await startJob(currentJobId, data);
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
  $('[data-copy-srt]').addEventListener('click', async () => {
    await navigator.clipboard.writeText(currentSrt || $('[data-srt-preview]').textContent || '');
    $('[data-copy-srt]').textContent = 'Copiado';
    setTimeout(() => { $('[data-copy-srt]').textContent = 'Copiar'; }, 1400);
  });
  $('[data-another-language]').addEventListener('click', () => $('#targetLanguage').focus());
  $('[data-another-style]').addEventListener('click', () => document.querySelector('input[name="captionStyle"]:not(:checked)')?.focus());
  $$('[data-short]').forEach((button) => button.addEventListener('click', () => {
    setRealStatus('completed', button.dataset.short === 'tiktok' ? 'Use o MP4 baixado para criar uma versão vertical no editor.' : 'Use o MP4 baixado para publicar em Shorts.');
  }));
})();
