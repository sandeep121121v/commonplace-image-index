const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const results = document.getElementById("results");
const resultCount = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");
const clearButton = document.getElementById("clear-search");
const savedResults = document.getElementById("saved-results");
const savedEmptyState = document.getElementById("saved-empty-state");
const collectionCount = document.getElementById("collection-count");
const headerSavedCount = document.getElementById("header-saved-count");
const emptyTitle = emptyState?.querySelector(".empty-title");
const emptyCopy = emptyState?.querySelector(".empty-copy");
const emptyFootnote = emptyState?.querySelector(".empty-footnote");

const savedStorageKey = "commonplace-saved-images";
const defaultEmptyState = {
  title: "A little room for discovery.",
  copy: "Search for a subject to bring the first images here.",
  footnote: "YOUR NEXT FIND IS OUT THERE",
};
let searchRevision = 0;
let savedImages = loadSavedImages();

if (!searchForm || !searchInput || !searchButton || !results || !resultCount || !emptyState || !emptyTitle || !emptyCopy || !emptyFootnote || !clearButton || !savedResults || !savedEmptyState || !collectionCount || !headerSavedCount) {
  throw new Error("The Commonplace search interface is missing a required element.");
}

function loadSavedImages() {
  try {
    const saved = JSON.parse(localStorage.getItem(savedStorageKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function showEmptyState({ title, copy, footnote, isError = false }) {
  emptyTitle.textContent = title;
  emptyCopy.textContent = copy;
  emptyFootnote.textContent = footnote;
  emptyState.classList.toggle("empty-state--error", isError);
  emptyState.hidden = false;
}

function makeImageCard(imageData, isSavedCard = false) {
  const card = document.createElement("article");
  const imageLink = document.createElement("a");
  const image = document.createElement("img");
  const caption = document.createElement("div");
  const title = document.createElement("h3");
  const credit = document.createElement("p");
  const saveButton = document.createElement("button");

  card.className = "image-card";
  imageLink.className = "image-card__link";
  imageLink.href = imageData.originalUrl || imageData.thumbUrl;
  imageLink.target = "_blank";
  imageLink.rel = "noopener noreferrer";
  imageLink.setAttribute("aria-label", `Open full-size image: ${imageData.title}`);

  image.className = "image-card__image";
  image.src = imageData.thumbUrl;
  image.alt = imageData.title;
  image.loading = "lazy";
  imageLink.appendChild(image);

  caption.className = "image-card__caption";
  title.className = "image-card__title";
  title.textContent = imageData.title;
  credit.className = "image-card__credit";
  credit.textContent = imageData.credit ? `Uploaded by ${imageData.credit}` : "Wikimedia Commons";

  saveButton.className = "save-button";
  saveButton.type = "button";
  saveButton.dataset.imageId = imageData.id;
  if (isSavedCard) {
    saveButton.textContent = "Remove";
    saveButton.setAttribute("aria-label", `Remove ${imageData.title} from your collection`);
  } else {
    const isSaved = isImageSaved(imageData.id);
    saveButton.textContent = isSaved ? "Saved ✓" : "Save";
    saveButton.setAttribute("aria-pressed", String(isSaved));
    saveButton.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${imageData.title} ${isSaved ? "from" : "to"} your collection`);
  }
  saveButton.addEventListener("click", () => toggleSavedImage(imageData));

  caption.appendChild(title);
  caption.appendChild(credit);
  card.appendChild(imageLink);
  card.appendChild(caption);
  card.appendChild(saveButton);
  return card;
}

function isImageSaved(imageId) {
  return savedImages.some((image) => image.id === String(imageId));
}

function renderSavedCollection() {
  savedResults.innerHTML = "";
  collectionCount.textContent = String(savedImages.length);
  headerSavedCount.textContent = String(savedImages.length);
  savedEmptyState.hidden = savedImages.length > 0;

  for (const image of savedImages) {
    savedResults.appendChild(makeImageCard(image, true));
  }
}

function refreshSearchSaveButtons() {
  results.querySelectorAll(".save-button").forEach((button) => {
    const saved = isImageSaved(button.dataset.imageId);
    const title = button.closest(".image-card")?.querySelector(".image-card__title")?.textContent || "image";
    button.textContent = saved ? "Saved ✓" : "Save";
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-label", `${saved ? "Remove" : "Save"} ${title} ${saved ? "from" : "to"} your collection`);
  });
}

function toggleSavedImage(imageData) {
  if (isImageSaved(imageData.id)) {
    savedImages = savedImages.filter((image) => image.id !== String(imageData.id));
  } else {
    savedImages = [{ ...imageData, id: String(imageData.id) }, ...savedImages];
  }

  try {
    localStorage.setItem(savedStorageKey, JSON.stringify(savedImages));
  } catch {
    // Keep the current page usable if browser storage is unavailable.
  }

  renderSavedCollection();
  refreshSearchSaveButtons();
}

async function searchImages(query, revision) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url%7Cuser&iiurlwidth=640&format=json&origin=*`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Wikimedia Commons returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  if (revision !== searchRevision) return;

  const pages = Object.values(data.query?.pages ?? {});
  const images = pages
    .filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
    .map((page) => ({
      id: String(page.pageid),
      title: page.title.replace(/^File:/, ""),
      thumbUrl: page.imageinfo[0].thumburl || page.imageinfo[0].url,
      originalUrl: page.imageinfo[0].url || page.imageinfo[0].thumburl,
      credit: page.imageinfo[0].user || "",
    }));

  results.innerHTML = "";
  resultCount.textContent = String(images.length);

  if (images.length === 0) {
    showEmptyState({
      title: `No images found for “${query}”.`,
      copy: "Try a broader topic or a different spelling.",
      footnote: "NO MATCHES THIS TIME",
    });
    return;
  }

  emptyState.classList.remove("empty-state--error");
  emptyState.hidden = true;
  images.forEach((image) => results.appendChild(makeImageCard(image)));
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = searchInput.value.trim();
  if (!query) return;

  const revision = ++searchRevision;
  results.innerHTML = "";
  resultCount.textContent = "0";
  showEmptyState({
    title: "Looking through the archive…",
    copy: `Searching for “${query}”.`,
    footnote: "A MOMENT, PLEASE",
  });

  try {
    await searchImages(query, revision);
  } catch (error) {
    if (revision !== searchRevision) return;

    const failedResponse = error instanceof Error && error.message.startsWith("Wikimedia Commons returned HTTP");
    showEmptyState({
      title: "Search couldn't finish.",
      copy: failedResponse
        ? "Wikimedia Commons couldn't complete that search. Please try again."
        : "We couldn't reach Wikimedia Commons. Check your connection and try again.",
      footnote: "YOUR SEARCH IS SAFE TO RETRY",
      isError: true,
    });
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    searchInput.value = chip.textContent.trim();
    searchForm.requestSubmit();
  });
});

clearButton.addEventListener("click", () => {
  searchRevision += 1;
  searchInput.value = "";
  results.innerHTML = "";
  resultCount.textContent = "0";
  showEmptyState(defaultEmptyState);
  searchInput.focus();
});

renderSavedCollection();
