(() => {
  const MAX_COVER_SIZE = 10 * 1024 * 1024;
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MAX_FILES = 3;
  const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
  let uploadConfigPromise = null;

  const selectors = {
    form: '[data-ecos-submission-form]',
    status: '[data-ecos-submission-message]',
    submit: '[data-ecos-submit-button]',
    cover: '[data-ecos-cover-input]',
    files: '[data-ecos-files-input]',
    authorship: '[data-ecos-authorship]',
    display: '[data-ecos-display]'
  };

  const getElement = (selector) => document.querySelector(selector);

  function setStatus(message, type = 'neutral') {
    const status = getElement(selectors.status);
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.dataset.state = type;
  }

  function validateFile(file, allowedTypes, maxSize, messages) {
    if (!file) throw new Error(messages.required);
    if (file.size > maxSize) throw new Error(messages.size);
    if (file.type && !allowedTypes.has(file.type)) throw new Error(messages.type);
  }

  function validateFiles(files) {
    if (files.length > MAX_FILES) {
      throw new Error('Envie no máximo 3 arquivos da obra ou utilize um link externo.');
    }
    files.forEach((file) => {
      validateFile(file, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, {
        required: 'Selecione um arquivo da obra.',
        size: 'Cada arquivo da obra pode ter até 50 MB.',
        type: 'Arquivos da obra devem ser PDF, JPG, PNG ou WEBP.'
      });
    });
  }

  async function apiFetch(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.message || result.error || 'Não foi possível processar o Eco.');
    }
    return result;
  }

  async function getUploadConfig() {
    if (!uploadConfigPromise) {
      uploadConfigPromise = fetch('/api/auth-config', { cache: 'no-store' })
        .then((response) => response.json())
        .then((config) => {
          if (!config.configured || !config.anonKey) {
            throw new Error('Envio temporariamente indisponível. Tente novamente mais tarde.');
          }
          return config;
        });
    }
    return uploadConfigPromise;
  }

  async function uploadDirect(file, target, config) {
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    const response = await fetch(target.signedUrl, {
      method: 'PUT',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'x-upsert': 'false'
      },
      body
    });
    if (!response.ok) {
      throw new Error('Não foi possível enviar os arquivos. Tente novamente com arquivos otimizados ou use um link externo.');
    }
  }

  function readForm(form) {
    const formData = new FormData(form);
    const coverFile = getElement(selectors.cover)?.files?.[0] || null;
    const files = Array.from(getElement(selectors.files)?.files || []);
    const authorship = Boolean(getElement(selectors.authorship)?.checked);
    const display = Boolean(getElement(selectors.display)?.checked);
    const values = {
      title: String(formData.get('title') || '').trim(),
      author_name: String(formData.get('penName') || '').trim(),
      author_email: String(formData.get('email') || '').trim(),
      social_url: String(formData.get('social') || '').trim(),
      creation_type: String(formData.get('creationType') || '').trim(),
      short_description: String(formData.get('summary') || '').trim(),
      content_text: String(formData.get('contentText') || '').trim(),
      external_link: String(formData.get('externalLink') || '').trim(),
      age_rating: String(formData.get('rating') || '').trim(),
      confirm_authorship: authorship,
      allow_public_display: display
    };

    if (!values.title) throw new Error('Informe o título da criação.');
    if (!values.author_name) throw new Error('Informe o nome artístico.');
    if (!values.author_email) throw new Error('Informe o e-mail.');
    if (!values.social_url) throw new Error('Informe a rede social principal.');
    if (!values.creation_type) throw new Error('Selecione o tipo de criação.');
    if (!values.short_description) throw new Error('Escreva uma descrição curta.');
    if (!values.age_rating) throw new Error('Selecione a classificação etária.');
    if (!authorship || !display) throw new Error('Confirme a autoria e a autorização de exibição antes de enviar.');

    validateFile(coverFile, ALLOWED_COVER_TYPES, MAX_COVER_SIZE, {
      required: 'Envie uma imagem de capa para o Eco.',
      size: 'A capa pode ter até 10 MB.',
      type: 'A capa deve estar em JPG, PNG ou WEBP.'
    });
    validateFiles(files);

    return { values, coverFile, files };
  }

  async function submitEco(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = getElement(selectors.submit);
    if (submitButton) submitButton.disabled = true;

    try {
      const { values, coverFile, files } = readForm(form);
      setStatus('Preparando envio seguro dos arquivos...', 'neutral');
      const uploadPlan = await apiFetch('/api/ecos-upload-urls', {
        title: values.title,
        cover: {
          name: coverFile.name,
          type: coverFile.type,
          size: coverFile.size
        },
        files: files.map((file) => ({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size
        }))
      });
      const uploadConfig = await getUploadConfig();

      setStatus('Enviando capa para o arquivo de Hélicon...', 'neutral');
      await uploadDirect(coverFile, uploadPlan.cover, uploadConfig);

      const uploadedFiles = [];
      for (const [index, file] of files.entries()) {
        const target = uploadPlan.files[index];
        if (!target) continue;
        setStatus(`Enviando arquivo ${index + 1} de ${files.length}...`, 'neutral');
        await uploadDirect(file, target, uploadConfig);
        uploadedFiles.push({
          path: target.path,
          name: file.name,
          type: file.type || target.type,
          size: file.size
        });
      }

      setStatus('Registrando Eco como pendente de análise...', 'neutral');
      const completed = await apiFetch('/api/ecos-submissions', {
        ...values,
        cover: {
          path: uploadPlan.cover.path,
          name: coverFile.name,
          type: coverFile.type,
          size: coverFile.size
        },
        files: uploadedFiles
      });

      if (completed.submission?.status !== 'pending') {
        throw new Error('O Eco não retornou com status pendente.');
      }

      form.reset();
      setStatus('Eco enviado com sucesso. Sua criação entrou para análise.', 'success');
    } catch (error) {
      const message = error.message === 'Envio temporariamente indisponível. Tente novamente mais tarde.'
        ? error.message
        : error.message || 'Não foi possível enviar os arquivos. Tente novamente com arquivos otimizados ou use um link externo.';
      setStatus(message, 'error');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  function bindValidation() {
    const filesInput = getElement(selectors.files);
    if (filesInput) {
      filesInput.addEventListener('change', () => {
        try {
          validateFiles(Array.from(filesInput.files || []));
          setStatus('Arquivos selecionados para análise.', 'neutral');
        } catch (error) {
          filesInput.value = '';
          setStatus(error.message, 'error');
        }
      });
    }
  }

  function init() {
    const form = getElement(selectors.form);
    if (!form) return;
    form.addEventListener('submit', submitEco);
    bindValidation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
