(() => {
  const MAX_FREE_BYTES = 150 * 1024 * 1024;
  const MAX_FREE_SECONDS = 180;
  const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm'];
  const languages = { auto: 'Detectado automaticamente', pt: 'Português', en: 'Inglês', es: 'Espanhol', fr: 'Francês', it: 'Italiano', de: 'Alemão', ja: 'Japonês', ko: 'Coreano' };
  const sampleLines = {
    pt: ['A ideia principal não é traduzir palavra por palavra.', 'É preservar intenção, emoção e contexto.', 'Assim o vídeo soa natural para quem assiste.'],
    en: ['The goal is not to translate word by word.', 'It is to preserve intent, emotion, and context.', 'That is how the video feels natural to the viewer.'],
    es: ['La idea no es traducir palabra por palabra.', 'Es preservar intención, emoción y contexto.', 'Así el video suena natural para quien lo ve.'],
    fr: ['Le but n’est pas de traduire mot à mot.', 'Il faut préserver l’intention, l’émotion et le contexte.', 'C’est comme ça que la vidéo paraît naturelle.'],
    it: ['L’obiettivo non è tradurre parola per parola.', 'È preservare intenzione, emozione e contesto.', 'Così il video risulta naturale per chi lo guarda.'],
    de: ['Es geht nicht darum, Wort für Wort zu übersetzen.', 'Es geht darum, Absicht, Emotion und Kontext zu bewahren.', 'So wirkt das Video für Zuschauer natürlich.'],
    ja: ['大切なのは、言葉を一語ずつ置き換えることではありません。', '意図、感情、文脈を保つことです。', 'だから視聴者に自然に伝わります。'],
    ko: ['핵심은 단어를 하나씩 바꾸는 것이 아닙니다.', '의도와 감정, 맥락을 살리는 것입니다.', '그래야 시청자에게 자연스럽게 전달됩니다.']
  };

  let currentFile = null;
  let currentObjectUrl = '';
  let currentSrt = '';
  let selectedPlan = 'free';
  let currentDuration = 0;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const form = $('[data-form]');
  const fileInput = $('#videoFile');
  const dropzone = $('[data-dropzone]');
  const preview = $('[data-preview]');
  const results = $('[data-results]');

  function setProgress(percent, stage, activeStep) {
    $('[data-percent]').textContent = `${percent}%`;
    $('[data-stage]').textContent = stage;
    $('[data-progress]').style.width = `${percent}%`;
    $$('[data-step]').forEach((step) => {
      const key = step.dataset.step;
      step.classList.toggle('active', key === activeStep);
      if (['upload', 'transcribe', 'translate', 'subtitle', 'export'].indexOf(key) < ['upload', 'transcribe', 'translate', 'subtitle', 'export'].indexOf(activeStep)) {
        step.classList.add('done');
      }
      if (percent === 0) step.classList.remove('active', 'done');
      if (percent === 100) step.classList.add('done');
    });
  }

  function showError(message) {
    setProgress(0, message, 'upload');
    $('[data-stage]').style.color = 'var(--danger)';
    setTimeout(() => { $('[data-stage]').style.color = ''; }, 2600);
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
    if (selectedPlan === 'free' && file.size > MAX_FREE_BYTES) return 'No plano grátis, use arquivos de até 150 MB.';
    return '';
  }

  function previewFile(file) {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);
    preview.innerHTML = `<video src="${currentObjectUrl}" controls playsinline></video><div class="watermark">Translated with TalkGlobal AI</div><div class="live-caption" data-live-caption>Gerando legenda natural...</div>`;
    const video = preview.querySelector('video');
    video.addEventListener('loadedmetadata', () => {
      currentDuration = video.duration || 0;
      if (selectedPlan === 'free' && currentDuration > MAX_FREE_SECONDS) {
        showError('No plano grátis, use vídeos de até 3 minutos.');
      } else {
        setProgress(18, `Arquivo pronto: ${formatSize(file.size)} • ${formatDuration(currentDuration)}`, 'upload');
      }
    });
  }

  function makeSrt(target) {
    const lines = sampleLines[target] || sampleLines.pt;
    const total = Math.max(18, Math.min(currentDuration || 24, 42));
    const chunk = Math.max(4, Math.floor(total / lines.length));
    return lines.map((text, index) => {
      const start = index * chunk;
      const end = index === lines.length - 1 ? total : start + chunk;
      return `${index + 1}\n${toTime(start)} --> ${toTime(end)}\n${text}\n`;
    }).join('\n');
  }

  function toTime(value) {
    const h = Math.floor(value / 3600).toString().padStart(2, '0');
    const m = Math.floor((value % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(value % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s},000`;
  }

  async function simulateProcessing(data) {
    const stages = [
      [32, 'Enviando arquivo com segurança...', 'upload'],
      [48, 'Extraindo áudio e preparando transcrição...', 'transcribe'],
      [66, 'Adaptando intenção, emoção e contexto...', 'translate'],
      [84, `Aplicando estilo ${data.captionStyle}...`, 'subtitle'],
      [100, selectedPlan === 'free' ? 'Export demo com watermark pronto.' : 'Export premium simulado pronto.', 'export']
    ];
    for (const [percent, label, step] of stages) {
      await new Promise((resolve) => setTimeout(resolve, 520));
      setProgress(percent, label, step);
    }
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

  function renderResult(data) {
    currentSrt = makeSrt(data.targetLanguage);
    const caption = $('[data-live-caption]');
    if (caption) caption.textContent = (sampleLines[data.targetLanguage] || sampleLines.pt)[0];
    applyCaptionStyle(data.captionStyle);
    $('[data-file-name]').textContent = currentFile.name;
    $('[data-file-meta]').textContent = `${formatSize(currentFile.size)} • ${formatDuration(currentDuration)} • ${selectedPlan}`;
    $('[data-target-label]').textContent = languages[data.targetLanguage];
    $('[data-style-label]').textContent = `Legenda ${data.captionStyle}`;
    $('[data-watermark]').textContent = selectedPlan === 'free' ? 'Translated with TalkGlobal AI' : 'Sem watermark no premium';
    $('[data-srt-preview]').textContent = currentSrt;
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCurrentVideo() {
    if (!currentFile || !currentObjectUrl) return showError('Envie um vídeo antes de baixar o MP4 demo.');
    const a = document.createElement('a');
    a.href = currentObjectUrl;
    a.download = `talkglobal-demo-${currentFile.name}`;
    a.click();
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const error = validateFile(file);
    if (error) return showError(error);
    currentFile = file;
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
    if (selectedPlan === 'free' && currentDuration > MAX_FREE_SECONDS) return showError('No plano grátis, use vídeos de até 3 minutos.');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    await simulateProcessing(data);
    renderResult(data);
  });

  $('[data-download-srt]').addEventListener('click', () => downloadText('translated-with-talkglobal-ai.srt', currentSrt || makeSrt($('#targetLanguage').value)));
  $('[data-download-mp4]').addEventListener('click', downloadCurrentVideo);
  $('[data-copy-srt]').addEventListener('click', async () => {
    await navigator.clipboard.writeText(currentSrt || $('[data-srt-preview]').textContent || '');
    $('[data-copy-srt]').textContent = 'Copiado';
    setTimeout(() => { $('[data-copy-srt]').textContent = 'Copiar'; }, 1400);
  });
  $('[data-another-language]').addEventListener('click', () => $('#targetLanguage').focus());
  $('[data-another-style]').addEventListener('click', () => document.querySelector('input[name="captionStyle"]:not(:checked)').focus());
  $$('[data-short]').forEach((button) => button.addEventListener('click', () => {
    setProgress(100, button.dataset.short === 'tiktok' ? 'Versão vertical 9:16 preparada para a próxima etapa.' : 'Versão Shorts preparada para a próxima etapa.', 'export');
  }));
})();
