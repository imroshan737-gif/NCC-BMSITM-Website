(() => {
  const grid = document.getElementById("gallery-grid");
  const filterBar = document.getElementById("gallery-filters");

  if (!grid) {
    return;
  }

  const state = {
    items: [],
    cards: [],
    filter: "all"
  };

  const instagramCleanup = () => {
    grid.querySelectorAll(".gallery-card, [data-source=\"instagram\"]").forEach((node) => {
      node.remove();
    });
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.classList.contains("gallery-card") || node.dataset.source === "instagram") {
          node.remove();
        }
      });
    });
  });

  observer.observe(grid, { childList: true });

  const toTitleCase = (value) =>
    value
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const normalizeCategory = (category) => {
    if (!category) return "general";
    return category.toString().trim().toLowerCase();
  };

  const categoryFromFilename = (filename) => {
    const name = filename.toLowerCase();
    if (name.includes("republic")) return "republic-day";
    if (name.includes("annual") || name.includes("review")) return "annual-review";
    if (name.includes("blood")) return "blood-donation";
    if (name.includes("candle")) return "candle-march";
    if (name.includes("aitsc")) return "aitsc";
    if (name.includes("para")) return "para-basic";
    if (name.includes("walk4lake")) return "walk4lake";
    if (name.includes("training")) return "training";
    return "general";
  };

  const titleFromFilename = (filename) => {
    const clean = filename.replace(/\.[^/.]+$/, "");
    return toTitleCase(clean);
  };

  const buildFilters = (categories) => {
    if (!filterBar) return;

    filterBar.innerHTML = "";

    const uniqueCategories = Array.from(new Set(categories)).filter(Boolean);
    if (uniqueCategories.length <= 1) {
      filterBar.style.display = "none";
      return;
    }

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "album-filter active";
    allBtn.dataset.filter = "all";
    allBtn.textContent = "All";
    filterBar.appendChild(allBtn);

    uniqueCategories.sort().forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "album-filter";
      button.dataset.filter = category;
      button.textContent = toTitleCase(category);
      filterBar.appendChild(button);
    });

    filterBar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;

      filterBar.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      render(button.dataset.filter);
    });
  };

  const buildCards = () => {
    grid.innerHTML = "";
    instagramCleanup();
    state.cards = [];

    state.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "gallery-item reveal";
      card.dataset.category = item.category;
      card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      card.innerHTML = `
        <picture class="img-frame">
          <img src="${item.src}" alt="${item.title}" loading="lazy" decoding="async" />
        </picture>
        <div class="gallery-overlay">${item.title}</div>
      `;

      const img = card.querySelector("img");
      img.style.transition = "transform 0.35s ease";

      card.addEventListener("mouseenter", () => {
        img.style.transform = "scale(1.05)";
      });

      card.addEventListener("mouseleave", () => {
        img.style.transform = "scale(1)";
      });

      img.addEventListener("error", () => {
        img.src = "/assets/images/placeholder-ncc.jpg";
      });

      img.addEventListener("click", () => {
        if (!window.Lightbox) return;
        const activeItems =
          state.filter === "all"
            ? state.items
            : state.items.filter((entry) => entry.category === state.filter);
        const activeIndex = activeItems.findIndex((entry) => entry.src === item.src);
        window.Lightbox.open(item.src, item.title, activeItems, Math.max(activeIndex, 0));
      });

      state.cards.push({ element: card, item });
      grid.appendChild(card);
    });

    if (window.ScrollReveal) {
      window.ScrollReveal.observe(grid.querySelectorAll(".gallery-item"));
    }
  };

  const toggleCardVisibility = (card, visible) => {
    if (visible) {
      card.style.display = "";
      requestAnimationFrame(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      });
      return;
    }

    card.style.opacity = "0";
    card.style.transform = "translateY(10px)";
    if (card._hideTimer) {
      clearTimeout(card._hideTimer);
    }
    card._hideTimer = setTimeout(() => {
      if (card.style.opacity === "0") {
        card.style.display = "none";
      }
    }, 240);
  };

  const render = (filter) => {
    state.filter = filter || "all";

    const visibleItems =
      state.filter === "all"
        ? state.items
        : state.items.filter((item) => item.category === state.filter);

    if (!visibleItems.length) {
      grid.innerHTML = "";
      state.cards = [];
      const empty = document.createElement("p");
      empty.className = "gallery-empty";
      empty.textContent = "No images available in this category.";
      grid.appendChild(empty);
      return;
    }

    if (!state.cards.length) {
      buildCards();
    }

    const visibleSet = new Set(visibleItems.map((item) => item.src));
    state.cards.forEach(({ element, item }) => {
      const isVisible = visibleSet.has(item.src);
      toggleCardVisibility(element, isVisible);
    });
  };

  const parseDirectoryListing = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a"))
      .map((link) => link.getAttribute("href"))
      .filter(Boolean)
      .map((href) => href.split("?")[0]);

    const files = links.filter((href) => /\.(jpe?g|png|webp|gif)$/i.test(href));
    const uniqueFiles = Array.from(new Set(files));

    return uniqueFiles.map((file) => {
      const clean = file.replace(/^\/+/, "");
      const parts = clean.split("/");
      const fileName = parts.pop() || clean;
      const folder = parts.pop();
      const category = folder ? normalizeCategory(folder) : categoryFromFilename(fileName);
      return {
        src: file.startsWith("http") ? file : `/assets/gallery/${fileName}`,
        title: titleFromFilename(fileName),
        category
      };
    });
  };

  const fetchDirectoryItems = async () => {
    try {
      const response = await fetch("/assets/gallery/");
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return null;
      const html = await response.text();
      const items = parseDirectoryListing(html);
      return items.length ? items : null;
    } catch (error) {
      return null;
    }
  };

  const fetchJsonItems = async () => {
    const sources = ["/gallery.json"];

    for (const url of sources) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items;
        if (items && items.length) {
          return items.map((item) => ({
            src: item.src,
            title: item.title || item.alt || "NCC BMSITM",
            category: normalizeCategory(item.category)
          }));
        }
      } catch (error) {
        continue;
      }
    }

    return [];
  };

  const extractTimestamp = (src) => {
    const match = src.match(/(\d{10})/);
    if (!match) return null;
    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds)) return null;
    return new Date(seconds * 1000);
  };

  const init = async () => {
    const directoryItems = await fetchDirectoryItems();
    const items = directoryItems || (await fetchJsonItems());

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 3);

    state.items = items
      .map((item) => {
        const date = extractTimestamp(item.src || "");
        return {
          src: item.src,
          title: item.title,
          category: normalizeCategory(item.category),
          date
        };
      })
      .filter((item) => !item.date || item.date >= cutoff)
      .sort((a, b) => {
        const timeA = a.date ? a.date.getTime() : 0;
        const timeB = b.date ? b.date.getTime() : 0;
        return timeB - timeA;
      });

    if (!state.items.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-empty";
      empty.textContent = "No images found. Add files to /assets/gallery/ or update gallery.json.";
      grid.appendChild(empty);
      return;
    }

    buildFilters(state.items.map((item) => item.category));
    buildCards();
    render("all");
  };

  const initLightboxKeyboard = () => {
    const lightbox = document.querySelector(".lightbox");
    if (!lightbox) return;

    const closeBtn = lightbox.querySelector(".lightbox-close");
    const prevBtn = lightbox.querySelector(".lightbox-prev");
    const nextBtn = lightbox.querySelector(".lightbox-next");

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("open")) return;
      if (event.key === "Escape") {
        closeBtn?.click();
      }
      if (event.key === "ArrowLeft") {
        prevBtn?.click();
      }
      if (event.key === "ArrowRight") {
        nextBtn?.click();
      }
    });
  };

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("DOMContentLoaded", initLightboxKeyboard);
})();
