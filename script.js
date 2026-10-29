const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const results = document.getElementById("results");
const resultCount = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");
const clearButton = document.getElementById("clear-search");
const emptyTitle = emptyState?.querySelector(".empty-title");
const emptyCopy = emptyState?.querySelector(".empty-copy");
const emptyFootnote = emptyState?.querySelector(".empty-footnote");

const defaultEmptyState = {
  title: "A blank page, for now.",
  copy: "Search for something on your mind. Your collection will take shape here.",
  footnote: "WAITING FOR A FIRST FINDING ↗",
};
let searchRevision = 0;

if (!searchForm || !searchInput || !searchButton || !results || !resultCount || !emptyState || !emptyTitle || !emptyCopy || !emptyFootnote || !clearButton) {
  throw new Error("The Commonplace search interface is missing a required element.");
}

function showEmptyState({ title, copy, footnote, isError = false }) {
  emptyTitle.textContent = title;
  emptyCopy.textContent = copy;
  emptyFootnote.textContent = footnote;
  emptyState.classList.toggle("empty-state--error", isError);
  emptyState.hidden = false;
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
  const images = pages.filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);

  results.innerHTML = "";
  resultCount.textContent = String(images.length);

  if (images.length === 0) {
    showEmptyState({
      title: `No images found for “${query}”.`,
      copy: "Try a broader topic or a different spelling.",
      footnote: "NO MATCHES THIS TIME ↗",
    });
    return;
  }

  emptyState.classList.remove("empty-state--error");
  emptyState.hidden = true;

  for (const page of images) {
    const imageInfo = page.imageinfo[0];
    const card = document.createElement("article");
    const image = document.createElement("img");
    const caption = document.createElement("div");
    const title = document.createElement("h3");
    const credit = document.createElement("p");

    card.className = "image-card";
    image.className = "image-card__image";
    image.src = imageInfo.thumburl || imageInfo.url;
    image.alt = page.title.replace(/^File:/, "");
    image.loading = "lazy";

    caption.className = "image-card__caption";
    title.className = "image-card__title";
    title.textContent = page.title.replace(/^File:/, "");
    credit.className = "image-card__credit";
    credit.textContent = imageInfo.user ? `Uploaded by ${imageInfo.user}` : "Wikimedia Commons";

    caption.appendChild(title);
    caption.appendChild(credit);
    card.appendChild(image);
    card.appendChild(caption);
    results.appendChild(card);
  }
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
    footnote: "A MOMENT, PLEASE ↗",
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
      footnote: "YOUR SEARCH IS SAFE TO RETRY ↗",
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
