const IMAGE_DIR = "Eps";
const EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const FALLBACK_TOTAL_PAGES = 30;
const MANIFEST = Array.isArray(window.MANGA_PAGES) ? window.MANGA_PAGES : [];

const reader = document.querySelector("#manga-reader");
const bookReader = document.querySelector("#book-reader");
const bookImage = document.querySelector(".book-image");
const bookCounter = document.querySelector(".book-counter");
const previousButton = document.querySelector(".book-prev");
const nextButton = document.querySelector(".book-next");
const backToTop = document.querySelector(".back-to-top");
const modeToggle = document.querySelector(".mode-toggle");
const pageStatus = document.querySelector(".page-status");

let totalPages = MANIFEST.length || FALLBACK_TOTAL_PAGES;
let currentPage = 1;
let isBookMode = false;

function getImagePath(pageNumber, extensionIndex = 0) {
  return `${IMAGE_DIR}/${pageNumber}.${EXTENSIONS[extensionIndex]}`;
}

function getPageSource(pageNumber, extensionIndex = 0) {
  const manifestItem = MANIFEST[pageNumber - 1];

  if (manifestItem) {
    return `${IMAGE_DIR}/${manifestItem}`;
  }

  return getImagePath(pageNumber, extensionIndex);
}

function scrollToPage(pageNumber) {
  if (isBookMode) {
    showBookPage(pageNumber, "next");
    return;
  }

  const page = document.querySelector(`[data-page="${pageNumber}"]`);

  if (page) {
    page.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function handleImageError(image, pageNumber) {
  if (MANIFEST[pageNumber - 1]) {
    const page = image.closest(".manga-page");
    page.classList.add("is-missing");
    page.textContent = `Página ${pageNumber} não encontrada.`;
    return;
  }

  const nextExtensionIndex = Number(image.dataset.extensionIndex) + 1;

  if (nextExtensionIndex < EXTENSIONS.length) {
    image.dataset.extensionIndex = String(nextExtensionIndex);
    image.src = getPageSource(pageNumber, nextExtensionIndex);
    return;
  }

  const page = image.closest(".manga-page");
  page.classList.add("is-missing");
  page.textContent = `Página ${pageNumber} não encontrada.`;
}

function createPage(pageNumber) {
  const page = document.createElement("figure");
  const image = document.createElement("img");

  page.className = "manga-page";
  page.dataset.page = String(pageNumber);

  image.src = getPageSource(pageNumber);
  image.alt = `Página ${pageNumber}`;
  image.loading = pageNumber <= 2 ? "eager" : "lazy";
  image.decoding = "async";
  image.tabIndex = 0;
  image.dataset.extensionIndex = "0";

  image.addEventListener("error", () => handleImageError(image, pageNumber));
  image.addEventListener("click", () => scrollToPage(pageNumber + 1));
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      scrollToPage(pageNumber + 1);
    }
  });

  page.appendChild(image);
  reader.appendChild(page);
}

function createReader() {
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    createPage(pageNumber);
  }

  createContinueCard(totalPages);
  showBookPage(1);
}

function createContinueCard(totalPages) {
  const card = document.createElement("section");

  card.className = "continue-card";
  card.innerHTML = `
    <p>Fim do episódio</p>
    <strong>Continua</strong>
    <span>${totalPages} páginas</span>
  `;

  reader.appendChild(card);
}

function animateTurn(direction) {
  const animationClass = direction === "prev" ? "turn-prev" : "turn-next";

  bookImage.classList.remove("turn-prev", "turn-next");
  void bookImage.offsetWidth;
  bookImage.classList.add(animationClass);
}

function showBookPage(pageNumber, direction = "next") {
  if (pageNumber < 1 || pageNumber > totalPages) {
    return;
  }

  currentPage = pageNumber;
  bookImage.src = getPageSource(currentPage);
  bookImage.alt = `Página ${currentPage}`;
  bookCounter.textContent = `Página ${currentPage} / ${totalPages}`;
  pageStatus.textContent = isBookMode ? `Página ${currentPage} / ${totalPages}` : "Vertical";
  previousButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;

  if (isBookMode) {
    animateTurn(direction);
  }
}

function toggleBookMode() {
  isBookMode = !isBookMode;
  document.body.classList.toggle("book-mode", isBookMode);
  reader.hidden = isBookMode;
  bookReader.hidden = !isBookMode;
  backToTop.hidden = isBookMode;
  modeToggle.setAttribute("aria-pressed", String(isBookMode));
  modeToggle.textContent = isBookMode ? "Modo vertical" : "Modo livro";
  pageStatus.textContent = isBookMode ? `Página ${currentPage} / ${totalPages}` : "Vertical";

  if (isBookMode) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    showBookPage(currentPage);
  } else {
    window.setTimeout(() => scrollToPage(currentPage), 80);
  }
}

function goToNextBookPage() {
  showBookPage(currentPage + 1, "next");
}

function goToPreviousBookPage() {
  showBookPage(currentPage - 1, "prev");
}

function updateBackToTopButton() {
  backToTop.classList.toggle("is-visible", window.scrollY > 500);
}

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", updateBackToTopButton, { passive: true });
modeToggle.addEventListener("click", toggleBookMode);
nextButton.addEventListener("click", goToNextBookPage);
previousButton.addEventListener("click", goToPreviousBookPage);
bookImage.addEventListener("click", goToNextBookPage);

document.addEventListener("keydown", (event) => {
  if (!isBookMode) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault();
    goToNextBookPage();
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    goToPreviousBookPage();
  }
});

createReader();
