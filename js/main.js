// js/main.js
(() => {
  updateFooterYear();
  setupPortfolioNavigation();
  showAdminReturnLink();
  setupPublicEffects();

  function updateFooterYear() {
    const yearEl = document.getElementById("year");
    if (!yearEl) return;
    yearEl.textContent = new Date().getFullYear();
  }

  function setupPortfolioNavigation() {
    const navigation = document.querySelector(".portfolio-nav");
    if (!navigation) return;

    const links = Array.from(
      navigation.querySelectorAll('a[href^="#"]')
    );
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!links.length || !sections.length) return;

    const setCurrent = (id) => {
      for (const link of links) {
        const active = link.getAttribute("href") === "#" + id;
        if (active) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    };

    for (const link of links) {
      link.addEventListener("click", (event) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;

        event.preventDefault();
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        target.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });

        window.history.replaceState(null, "", link.getAttribute("href"));
        setCurrent(target.id);
      });
    }

    if (!("IntersectionObserver" in window)) return;

    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleSections.set(entry.target.id, entry);
        }

        const current = Array.from(visibleSections.values())
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current) setCurrent(current.target.id);
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.15, 0.35, 0.6],
      }
    );

    for (const section of sections) observer.observe(section);
  }

  async function showAdminReturnLink() {
    if (isAdminPage()) return;

    try {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.ok || !data.authenticated) return;

      document
        .querySelectorAll(".site-nav, [data-admin-links]")
        .forEach((navigation) => {
          if (navigation.querySelector("[data-admin-return]")) return;

          const link = document.createElement("a");
          link.href = "admin.html";
          link.className = "site-nav__admin-return";
          link.dataset.adminReturn = "";
          link.textContent = "Admin Dashboard";
          link.setAttribute("aria-label", "Return to the admin dashboard");
          navigation.append(link);
        });
    } catch {
      // Keep public navigation unchanged if session checks are unavailable.
    }
  }

  function isAdminPage() {
    const page = window.location.pathname.split("/").filter(Boolean).pop() || "";
    return page === "admin" || page === "admin.html";
  }

  function setupPublicEffects() {
    if (isAdminPage()) return;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    root.classList.add("effects-ready");
    setupScrollReveals(reduceMotion);
    setupImageLightbox();
    setupArchivePreviews();

    if (document.body.classList.contains("article-page")) {
      setupReadingProgress();
    }

    if (!reduceMotion) setupCursorSpotlight();
  }

  function setupCursorSpotlight() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const spotlight = document.createElement("div");
    spotlight.className = "cursor-spotlight";
    spotlight.setAttribute("aria-hidden", "true");
    document.body.prepend(spotlight);

    let frame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 3;

    const paint = () => {
      spotlight.style.setProperty("--spotlight-x", `${pointerX}px`);
      spotlight.style.setProperty("--spotlight-y", `${pointerY}px`);
      frame = 0;
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) frame = window.requestAnimationFrame(paint);
      },
      { passive: true }
    );
  }

  function setupScrollReveals(reduceMotion) {
    const selector = [
      ".portfolio-section",
      ".portfolio-project",
      ".archive-hero > *",
      ".archive-section__heading",
      ".archive-row",
      ".writing-row",
      ".article-header",
      ".article-cover",
      ".article-facts",
      ".article-tags",
      ".article-toc",
      ".article-body > section",
      ".article-actions",
      ".article-footer",
    ].join(",");

    const observed = new WeakSet();
    const observer = !reduceMotion && "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          },
          { rootMargin: "0px 0px -8%", threshold: 0.08 }
        )
      : null;

    const register = (scope = document) => {
      const elements = [];
      if (scope instanceof Element && scope.matches(selector)) elements.push(scope);
      elements.push(...scope.querySelectorAll(selector));

      elements.forEach((element, index) => {
        if (observed.has(element)) return;
        observed.add(element);
        element.classList.add("reveal-item");
        element.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 45}ms`);
        if (observer) observer.observe(element);
        else element.classList.add("is-revealed");
      });
    };

    register();

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) register(node);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function setupReadingProgress() {
    const progress = document.createElement("div");
    progress.className = "reading-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.prepend(progress);

    let frame = 0;
    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const value = distance > 0 ? Math.min(window.scrollY / distance, 1) : 0;
      progress.style.transform = `scaleX(${value})`;
      frame = 0;
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
  }

  function setupArchivePreviews() {
    const enabled = window.matchMedia("(min-width: 781px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    // The page and row reveal transforms create containing/stacking contexts.
    // Keep one fixed preview directly under body, outside all transformed rows.
    const overlay = document.createElement("figure");
    overlay.className = "archive-pointer-preview";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.alt = "";
    overlay.append(image);
    document.body.append(overlay);
    let activeRow = null;
    const hide = () => { overlay.hidden = true; activeRow = null; };
    const registered = new WeakSet();
    const register = (scope = document) => {
      const rows = [];
      if (scope instanceof Element && scope.matches(".archive-row")) rows.push(scope);
      rows.push(...scope.querySelectorAll(".archive-row"));
      for (const row of rows) {
        if (!row.querySelector(".archive-row__preview img") || registered.has(row)) continue;
        registered.add(row);
        const follow = (event) => {
          if (!enabled.matches || event.pointerType === "touch" || document.body.classList.contains("lightbox-open")) { hide(); return; }
          const source = row.querySelector(".archive-row__preview img");
          const src = source?.currentSrc || source?.src;
          if (!src) { hide(); return; }
          if (activeRow !== row || image.src !== src) image.src = src;
          activeRow = row;
          overlay.hidden = false;
          const width = overlay.offsetWidth;
          const height = overlay.offsetHeight;
          const gap = 24, edge = 16;
          const right = event.clientX + gap;
          const x = right + width <= window.innerWidth - edge ? right : event.clientX - width - gap;
          const y = event.clientY - height / 2;
          overlay.style.left = `${Math.max(edge, Math.min(x, window.innerWidth - width - edge))}px`;
          overlay.style.top = `${Math.max(edge, Math.min(y, window.innerHeight - height - edge))}px`;
        };
        row.addEventListener("pointerenter", follow);
        row.addEventListener("pointermove", follow);
        row.addEventListener("pointerleave", hide);
        row.addEventListener("pointercancel", hide);
        row.addEventListener("click", hide);
      }
    };
    register();
    new MutationObserver((mutations) => {
      if (activeRow && !activeRow.isConnected) hide();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) register(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    enabled.addEventListener("change", hide);
    document.addEventListener("keydown", event => { if (event.key === "Escape" || event.key === "Tab") hide(); });
  }

  function setupImageLightbox() {
    const lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Expanded project screenshot");
    lightbox.innerHTML = `
      <button class="image-lightbox__close" type="button" aria-label="Close image">×</button>
      <button class="image-lightbox__nav image-lightbox__nav--previous" type="button" aria-label="Previous image">←</button>
      <figure class="image-lightbox__figure">
        <img class="image-lightbox__image" alt="" />
        <figcaption class="image-lightbox__caption"></figcaption>
      </figure>
      <button class="image-lightbox__nav image-lightbox__nav--next" type="button" aria-label="Next image">→</button>
      <p class="image-lightbox__count" aria-live="polite"></p>
    `;
    document.body.append(lightbox);

    const image = lightbox.querySelector(".image-lightbox__image");
    const caption = lightbox.querySelector(".image-lightbox__caption");
    const count = lightbox.querySelector(".image-lightbox__count");
    const closeButton = lightbox.querySelector(".image-lightbox__close");
    const previousButton = lightbox.querySelector(".image-lightbox__nav--previous");
    const nextButton = lightbox.querySelector(".image-lightbox__nav--next");
    let images = [];
    let currentIndex = 0;
    let returnFocus = null;

    const collectImages = () => Array.from(
      document.querySelectorAll(".article-cover img, .article-media img")
    ).filter((item) => item.currentSrc || item.src);

    const render = () => {
      const source = images[currentIndex];
      if (!source) return;
      image.src = source.currentSrc || source.src;
      image.alt = source.alt || "Expanded project screenshot";
      const text = source.dataset.caption || source.closest("figure")?.querySelector("figcaption")?.textContent?.trim()
        || source.alt
        || "Project screenshot";
      caption.textContent = text;
      count.textContent = `${currentIndex + 1} / ${images.length}`;
      previousButton.hidden = images.length < 2;
      nextButton.hidden = images.length < 2;
    };

    const open = (source, collection = collectImages(), focus = source) => {
      images = collection;
      currentIndex = Math.max(images.indexOf(source), 0);
      returnFocus = focus;
      render();
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      closeButton.focus();
    };

    const close = () => {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      if (returnFocus) returnFocus.focus({ preventScroll: true });
    };

    const move = (direction) => {
      currentIndex = (currentIndex + direction + images.length) % images.length;
      render();
    };

    document.addEventListener("click", (event) => {
      const galleryButton = event.target.closest("[data-hobby-gallery]");
      if (galleryButton) {
        try {
          const entries = JSON.parse(galleryButton.dataset.hobbyGallery);
          const collection = entries.map(entry => {
            const url = new URL(entry.src, window.location.origin);
            if (!["http:", "https:"].includes(url.protocol)) return null;
            const img = document.createElement("img");
            img.src = url.href; img.alt = entry.alt || ""; img.dataset.caption = entry.caption || "";
            return img;
          }).filter(Boolean);
          if (collection.length) open(collection[0], collection, galleryButton);
        } catch { /* Ignore an invalid gallery payload. */ }
        return;
      }
      const source = event.target.closest(".article-cover img, .article-media img");
      if (source) open(source);
    });

    document.addEventListener("keydown", (event) => {
      const source = event.target.closest?.(".article-cover img, .article-media img");
      if (source && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        open(source);
        return;
      }
      if (lightbox.hidden) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "Tab") {
        const controls = [closeButton, previousButton, nextButton].filter(
          (control) => !control.hidden
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    let touchStart = null;
    image.addEventListener("touchstart", event => {
      touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    image.addEventListener("touchend", event => {
      if (!touchStart || lightbox.hidden || images.length < 2) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
    }, { passive: true });
    image.addEventListener("touchcancel", () => { touchStart = null; });
    closeButton.addEventListener("click", close);
    previousButton.addEventListener("click", () => move(-1));
    nextButton.addEventListener("click", () => move(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });

    const enhanceImages = (scope = document) => {
      const items = [];
      if (scope instanceof Element && scope.matches(".article-cover img, .article-media img")) {
        items.push(scope);
      }
      items.push(...scope.querySelectorAll(".article-cover img, .article-media img"));
      for (const item of items) {
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `${item.alt || "Project screenshot"}. Open larger view`);
      }
    };

    enhanceImages();
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) enhanceImages(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
