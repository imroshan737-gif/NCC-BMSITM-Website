const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navClose = document.querySelector(".nav-close");
const navLinks = document.querySelectorAll(".nav-links a");
const scrollTopBtn = document.querySelector(".scroll-top");

if (navToggle && header) {
  navToggle.addEventListener("click", () => {
    header.classList.toggle("nav-open");
  });
}

if (navClose && header) {
  navClose.addEventListener("click", () => {
    header.classList.remove("nav-open");
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (header) {
      header.classList.remove("nav-open");
    }
  });
});

if (scrollTopBtn) {
  if ("IntersectionObserver" in window) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("data-scroll-sentinel", "true");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.position = "absolute";
    sentinel.style.top = "0";
    sentinel.style.left = "0";
    sentinel.style.width = "1px";
    sentinel.style.height = "1px";
    sentinel.style.pointerEvents = "none";
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        scrollTopBtn.classList.toggle("visible", !entry.isIntersecting);
      });
    });
    observer.observe(sentinel);
  } else {
    scrollTopBtn.classList.add("visible");
  }

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

let revealObserver = null;
const observeReveal = (items) => {
  if (!items) return;
  items.forEach((item) => {
    if (!item) return;
    if (revealObserver) {
      revealObserver.observe(item);
    } else {
      item.classList.add("visible");
    }
  });
};

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );
  observeReveal(revealItems);
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

window.ScrollReveal = {
  observe: (items) => observeReveal(Array.from(items || []))
};

const placeholderImages = document.querySelectorAll('img[data-placeholder="true"]');
placeholderImages.forEach((img) => {
  const frame = img.closest(".img-frame");
  if (!frame) {
    return;
  }
  const handleLoad = () => frame.classList.add("is-loaded");
  if (img.complete && img.naturalWidth > 0) {
    handleLoad();
  }
  img.addEventListener("load", handleLoad);
});

const filterBars = document.querySelectorAll("[data-filter-bar]");
filterBars.forEach((bar) => {
  const group = bar.dataset.filterBar;
  const buttons = bar.querySelectorAll("[data-filter]");
  const items = document.querySelectorAll(`[data-filter-item="${group}"]`);

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      items.forEach((item) => {
        const category = item.dataset.category;
        const isMatch = filter === "all" || category === filter;
        item.classList.toggle("hidden", !isMatch);
      });
    });
  });
});

const lightbox = document.querySelector(".lightbox");
const lightboxImg = lightbox?.querySelector(".lightbox-image");
const btnClose = lightbox?.querySelector(".lightbox-close");
const btnPrev = lightbox?.querySelector(".lightbox-prev");
const btnNext = lightbox?.querySelector(".lightbox-next");
let lightboxImages = [];
let currentIndex = 0;

const updateLightbox = () => {
  if (!lightboxImg || lightboxImages.length === 0) return;
  const item = lightboxImages[currentIndex];
  lightboxImg.src = item.src;
  lightboxImg.alt = item.alt || "Gallery image";
};

const openLightbox = (images, index = 0) => {
  if (!lightbox || !lightboxImg) return;
  lightboxImages = images;
  currentIndex = index;
  updateLightbox();
  lightbox.classList.add("open");
};

const closeLightbox = () => {
  lightbox?.classList.remove("open");
};

const showPrev = () => {
  if (lightboxImages.length === 0) return;
  currentIndex = (currentIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightbox();
};

const showNext = () => {
  if (lightboxImages.length === 0) return;
  currentIndex = (currentIndex + 1) % lightboxImages.length;
  updateLightbox();
};

if (lightbox) {
  const staticImages = Array.from(document.querySelectorAll(".gallery-item img"));
  if (staticImages.length) {
    const staticList = staticImages.map((img) => ({ src: img.src, alt: img.alt }));
    staticImages.forEach((img, index) => {
      img.addEventListener("click", () => openLightbox(staticList, index));
    });
  }

  btnClose?.addEventListener("click", closeLightbox);
  btnPrev?.addEventListener("click", showPrev);
  btnNext?.addEventListener("click", showNext);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

window.Lightbox = {
  open: (src, title, list, index = 0) => {
    if (!lightbox || !lightboxImg) return;
    if (Array.isArray(list) && list.length) {
      const mapped = list.map((item) => ({
        src: item.image || item.src,
        alt: item.title || item.alt || "Gallery image"
      }));
      openLightbox(mapped, index);
      return;
    }
    if (src) {
      openLightbox([{ src, alt: title || "Gallery image" }], 0);
    }
  }
};

const InstagramGallery = {
  posts: [],
  currentFilter: "all",

  async init() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;

    const banner = document.getElementById("instagram-meta-banner");
    const lastUpdated = document.getElementById("ig-last-updated");

    try {
      let res = await fetch("/data/instagram-posts.json");
      if (!res.ok) {
        res = await fetch("/public/data/instagram-posts.json");
      }
      if (!res.ok) throw new Error("Could not load instagram-posts.json");
      const data = await res.json();

      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 3);
      this.posts = (data.posts || [])
        .filter((post) => {
          const date = new Date(post.date);
          return Number.isFinite(date.getTime()) && date >= cutoff;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (lastUpdated && data.last_updated) {
        const date = new Date(data.last_updated);
        lastUpdated.textContent = date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
      }

      const buttons = Array.from(document.querySelectorAll(".album-filter"));
      const urlFilter = new URLSearchParams(window.location.search).get("filter");
      const initial = buttons.find((btn) => btn.dataset.filter === urlFilter)?.dataset.filter || "all";
      buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.filter === initial));
      this.currentFilter = initial;
      if (banner) {
        banner.style.display = initial === "instagram" ? "flex" : "none";
      }

      this.render(initial);

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const filter = btn.dataset.filter;
          this.currentFilter = filter;
          if (banner) {
            banner.style.display = filter === "instagram" ? "flex" : "none";
          }
          this.render(filter);
        });
      });
    } catch (err) {
      console.warn("Instagram gallery load failed:", err);
      const igTab = document.querySelector('[data-filter="instagram"]');
      if (igTab) igTab.style.display = "none";
      if (banner) banner.style.display = "none";
    }
  },

  render(filter) {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;

    grid.querySelectorAll('.gallery-card[data-source="instagram"]').forEach((card) => card.remove());
    const empty = grid.querySelector(".gallery-empty");
    if (empty) empty.remove();

    const staticItems = grid.querySelectorAll(".gallery-item");
    const showStatic = filter === "all";
    staticItems.forEach((item) => {
      item.style.display = showStatic ? "" : "none";
    });

    let filtered = this.posts;
    if (filter === "instagram") {
      filtered = this.posts;
    } else if (filter !== "all") {
      filtered = this.posts.filter((post) => post.tag === filter);
    }

    if (!filtered.length && filter !== "all") {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "gallery-empty";
      emptyMessage.textContent = "No posts found for this category.";
      grid.appendChild(emptyMessage);
      return;
    }

    filtered.forEach((post, index) => {
      const date = new Date(post.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      const card = document.createElement("div");
      card.className = "gallery-card reveal";
      card.dataset.source = "instagram";
      card.dataset.tag = post.tag;
      card.style.animationDelay = `${index * 0.05}s`;
      card.innerHTML = `
        <div class="gallery-card-img-wrap">
          <img
            src="${post.image}"
            alt="${post.title}"
            loading="lazy"
            onerror="this.src='/assets/images/placeholder-ncc.jpg'"
          />
          <div class="gallery-overlay">
            <span class="tag-pill ${post.tag}">${post.tag}</span>
            <p class="gallery-caption">${post.title}</p>
            <span class="gallery-date">${date}</span>
            <a
              href="${post.link}"
              target="_blank"
              rel="noopener noreferrer"
              class="ig-view-link"
            >
              View on Instagram ->
            </a>
          </div>
        </div>
        <div class="gallery-card-footer">
          <span class="tag-pill ${post.tag}">${post.tag}</span>
          <span class="gallery-date-footer">${date}</span>
        </div>
      `;

      card.querySelector("img").addEventListener("click", () => {
        window.Lightbox?.open(post.image, post.title, filtered, index);
      });

      grid.appendChild(card);
    });

    window.ScrollReveal?.observe(grid.querySelectorAll('.gallery-card[data-source="instagram"]'));
  }
};

async function initInstagramStrip() {
  const grid = document.getElementById("ig-strip-grid");
  const dateEl = document.getElementById("ig-strip-date");
  if (!grid) return;

  try {
    let res = await fetch("/data/instagram-posts.json");
    if (!res.ok) {
      res = await fetch("/public/data/instagram-posts.json");
    }
    if (!res.ok) throw new Error("Instagram posts unavailable");
    const data = await res.json();

    if (dateEl && data.last_updated) {
      dateEl.textContent = new Date(data.last_updated).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }

    grid.innerHTML = "";
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 3);
    const recent = (data.posts || [])
      .filter((post) => {
        const date = new Date(post.date);
        return Number.isFinite(date.getTime()) && date >= cutoff;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    recent.forEach((post) => {
      const date = new Date(post.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
      });
      const card = document.createElement("a");
      card.className = "ig-card";
      card.href = post.link;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.innerHTML = `
        <img src="${post.image}" alt="${post.title}" loading="lazy" onerror="this.src='/assets/images/placeholder-ncc.jpg'">
        <div class="ig-card-info">
          <span class="tag-pill ${post.tag}">${post.tag}</span>
          <p>${post.title}</p>
          <span class="gallery-date">${date}</span>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    const strip = document.getElementById("instagram-strip");
    if (strip) strip.style.display = "none";
  }
}

async function initActivitiesFeed() {
  const feed = document.querySelector("[data-activities-feed]");
  if (!feed) return;

  try {
    const res = await fetch("/activities.json");
    if (!res.ok) throw new Error("Activities feed unavailable");
    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const filteredEvents = events.filter((event) =>
      typeof event.modified === "number" && event.modified >= cutoff
    );
    const recentEvents = filteredEvents.length ? filteredEvents : events;

    if (!recentEvents.length) {
      feed.innerHTML = "<p class=\"gallery-empty\">No activity posts found.</p>";
      return;
    }

    feed.innerHTML = "";

    const placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

    recentEvents.forEach((event) => {
      const images = Array.isArray(event.images) ? event.images : [];
      if (!images.length) return;
      const cover = images[0];
      const countLabel = images.length === 1 ? "1 photo" : `${images.length} photos`;

      const card = document.createElement("article");
      card.className = "activity-post reveal";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="post-cover">
          <img data-src="${cover}" src="${placeholder}" alt="${event.event}" loading="lazy" decoding="async" />
          <span class="post-count">${countLabel}</span>
        </div>
        <div class="post-body">
          <div class="post-title">${event.event}</div>
          <div class="post-meta">Tap to view the full event set.</div>
        </div>
      `;

      card.addEventListener("click", () => {
        const list = images.map((src, index) => ({
          src,
          alt: `${event.event} photo ${index + 1}`
        }));
        window.Lightbox?.open(cover, event.event, list, 0);
      });

      card.addEventListener("keydown", (eventKey) => {
        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault();
          const list = images.map((src, index) => ({
            src,
            alt: `${event.event} photo ${index + 1}`
          }));
          window.Lightbox?.open(cover, event.event, list, 0);
        }
      });

      feed.appendChild(card);
    });

    initLazyImages(feed);
    window.ScrollReveal?.observe(feed.querySelectorAll(".activity-post"));
  } catch (err) {
    feed.innerHTML = "<p class=\"gallery-empty\">Unable to load activity posts.</p>";
  }
}

function initLazyImages(scope = document) {
  const lazyImages = Array.from(scope.querySelectorAll("img[data-src]"));
  if (!lazyImages.length) return;

  if (!("IntersectionObserver" in window)) {
    lazyImages.forEach((img) => {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        obs.unobserve(img);
      });
    },
    { rootMargin: "200px 0px" }
  );

  lazyImages.forEach((img) => observer.observe(img));
}

const forms = document.querySelectorAll("[data-form]");
forms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = form.parentElement.querySelector(".form-message");
    form.style.display = "none";
    if (message) {
      message.classList.add("visible");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  InstagramGallery.init();
  initInstagramStrip();
  initActivitiesFeed();
});

const aitscGalleries = {
  "2025": [
    { src: "/assets/aitsc-gallery/2025/p1.png", alt: "AITSC 2025 photo 1" }
  ],
  "2024": [
    { src: "/assets/aitsc-gallery/2024/p2.png", alt: "AITSC 2024 photo 1" }
  ],
  "2023": [
    { src: "/assets/aitsc-gallery/2023/p3.png", alt: "AITSC 2023 photo 1" }
  ]
};

document.querySelectorAll("[data-aitsc-year]").forEach((card) => {
  card.addEventListener("click", () => {
    const year = card.dataset.aitscYear;
    const images = aitscGalleries[year];
    if (images && images.length) {
      window.Lightbox.open(null, `AITSC ${year}`, images, 0);
    }
  });
});