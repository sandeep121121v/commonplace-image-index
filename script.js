const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const results = document.getElementById("results");
const resultCount = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");
const clearButton = document.getElementById("clear-search");

if (!searchForm || !searchInput || !searchButton || !results || !resultCount || !emptyState || !clearButton) {
  throw new Error("The Commonplace search interface is missing a required element.");
}

async function searchImages(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url%7Cuser&iiurlwidth=640&format=json&origin=*`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Wikimedia Commons returned ${response.status}.`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages ?? {});
  const images = pages.filter((page) => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url);

  results.innerHTML = "";
  resultCount.textContent = String(images.length);
  emptyState.hidden = images.length > 0;

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

  results.innerHTML = "";
  resultCount.textContent = "0";
  emptyState.hidden = false;

  await searchImages(query);
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    searchInput.value = chip.textContent.trim();
    searchForm.requestSubmit();
  });
});

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  results.innerHTML = "";
  resultCount.textContent = "0";
  emptyState.hidden = false;
  searchInput.focus();
});
