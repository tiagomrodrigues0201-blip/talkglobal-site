(() => {
  const MAX_COVER_SIZE = 10 * 1024 * 1024;
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MAX_FILES = 3;
  const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  const selectors = {
    form: '[data-ecos-submission-form]',
    status: '[data-ecos-submission-message]',
    submit: '[data-ecos-submit-button]',
    cover: '[data-ecos-cover-input]',
    files: '[data-ecos-files-input]'
  };

  const getElement = (selector) => document.querySelector(selector);

  function setStatus(message, type = 'neutral') {
    const status = getElement(selectors.status);
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.dataset.state = type;
  }

  function validateCover(file) {
    if (!file) throw new Error('Envie uma imagem de capa para o Eco.');
    if (file.size > MAX_COVER_SIZE) {
      throw new Error('A capa pode ter até 10 MB.');
    }
    if (file.type && !ALLOWED_COVER_TYPES.has(file.type)) {
      throw new Error('A capa deve estar em JPG, PNG ou WEBP.');
    }
  }

  function validateFiles(files) {
    if (files.length > MAX_FILES) {
      throw new Error('Envie no máximo 3 arquivos da obra ou utilize um link externo.');
    }
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Cada arquivo da obra pode ter até 50 MB.');
      }
      if (file.type && file.type !== 'application/pdf') {
        throw new Error('Nesta etapa, os arquivos anexos devem estar em PDF.');
      }
    });
  }

  function readForm(form) {
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const authorName = String(formData.get('penName') || '').trim();
    const authorEmail = String(formData.get('email') || '').trim();
    const creationType = String(formData.get('creationType') || '').trim();
    const shortDescription = String(formData.get('summary') || '').trim();
    const ageRating = String(formData.get('rating') || '').trim();
    const coverFile = getElement(selectors.cover)?.files?.[0] || null;
    const files = Array.from(getElement(selectors.files)?.files || []);

    if (!title) throw new Error('Informe o título da criação.');
    if (!authorName) throw new Error('Informe o nome artístico.');
    if (!authorEmail) throw new Error('Informe o e-mail.');
    if (!coverFile) throw new Error('Envie uma imagem de capa para o Eco.');
    if (!creationType) throw new Error('Selecione o tipo de criação.');
    if (!shortDescription) throw new Error('Escreva uma descrição curta.');
    if (!ageRating) throw new Error('Selecione a classificação etária.');

    validateCover(coverFile);
    validateFiles(files);
    return formData;
  }

  async function submitEco(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = getElement(selectors.submit);
    if (submitButton) submitButton.disabled = true;

    try {
      const formData = readForm(form);
      setStatus('Enviando Eco para análise segura...', 'neutral');
      const response = await fetch('/api/ecos-submissions', {
        method: 'POST',
        body: formData
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || 'Não foi possível processar o Eco.');
      }
      if (result.submission?.status !== 'pending') {
        throw new Error('O Eco não retornou com status pendente.');
      }

      form.reset();
      setStatus('Seu Eco foi enviado para análise. A publicação só acontece após revisão manual.', 'success');
    } catch (error) {
      setStatus(error.message || 'Não foi possível enviar seu Eco agora.', 'error');
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
