// js/writing.js
(() => {
  const homeList = document.querySelector("[data-writing-home]");
  const archiveList = document.querySelector("[data-writing-archive]");
  const filterButtons = Array.from(
    document.querySelectorAll("[data-writing-filter]")
  );
  const emptyState = document.querySelector("[data-writing-empty]");

  if (!homeList && !archiveList) return;

  let entries = [];

  loadWriting();

  async function loadWriting() {
    const [caseStudiesResult, notesResult] = await Promise.allSettled([
      fetchCollection("/api/case-studies", "case_studies"),
      fetchCollection("/api/blog", "blog_posts"),
    ]);

    const loadedCaseStudies = caseStudiesResult.status === "fulfilled"
      ? caseStudiesResult.value.map(normalizeCaseStudy)
      : [];
    const caseStudies = loadedCaseStudies.length
      ? loadedCaseStudies
      : [fallbackBikeStoreCaseStudy()];
    const notes = notesResult.status === "fulfilled"
      ? notesResult.value.map(normalizeNote)
      : [];

    entries = [...caseStudies, ...notes]
      .filter((entry) => entry.title && entry.url)
      .sort((a, b) => dateValue(b.date) - dateValue(a.date));

    if (!entries.length) return;

    if (homeList) {
      homeList.innerHTML = entries.slice(0, 3).map(renderHomeEntry).join("");
    }

    if (archiveList) {
      renderArchive("all");
      setupFilters();
    }
  }

  async function fetchCollection(url, key) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`${url} failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok || !Array.isArray(data[key])) {
      throw new Error(`Invalid response from ${url}`);
    }

    return data[key];
  }

  function fallbackBikeStoreCaseStudy() {
    return {
      type: "case-study",
      label: "Case study",
      title: "Building inventory and FIFO workflows around a real business",
      summary: "How a C# desktop application grew around the day-to-day needs of an electric-bike retailer.",
      date: "",
      url: "bike-store.html",
    };
  }

  function normalizeCaseStudy(item) {
    const slug = safeSlug(item.slug);
    const bikeStore = String(item.project_title || item.title || "")
      .toLowerCase()
      .includes("bike store");

    return {
      type: "case-study",
      label: "Case study",
      title: String(item.title || item.project_title || "").trim(),
      summary: String(item.summary || "").trim(),
      date: item.updated_at || item.created_at || "",
      url: slug
        ? `case-study.html?slug=${encodeURIComponent(slug)}`
        : bikeStore
          ? "bike-store.html"
          : "",
    };
  }

  function normalizeNote(item) {
    const slug = safeSlug(item.slug);

    return {
      type: "note",
      label: "Development note",
      title: String(item.title || "").trim(),
      summary: String(item.excerpt || "").trim(),
      date: item.updated_at || item.created_at || "",
      url: slug ? `blog-post.html?slug=${encodeURIComponent(slug)}` : "",
    };
  }

  function renderHomeEntry(entry) {
    return `
      <a href="${escapeAttr(entry.url)}">
        <span>
          <small>${escapeHtml(entry.label)}${formatDate(entry.date) ? ` · ${escapeHtml(formatDate(entry.date))}` : ""}</small>
          ${escapeHtml(entry.title)}
        </span>
        <span aria-hidden="true">→</span>
      </a>
    `;
  }

  function renderArchive(filter) {
    const visibleEntries = filter === "all"
      ? entries
      : entries.filter((entry) => entry.type === filter);

    archiveList.innerHTML = visibleEntries.map(renderArchiveEntry).join("");
    if (emptyState) emptyState.hidden = visibleEntries.length > 0;
  }

  function renderArchiveEntry(entry) {
    return `
      <article class="writing-row" data-writing-type="${escapeAttr(entry.type)}">
        <p class="writing-row__type">${escapeHtml(entry.label)}${formatDate(entry.date) ? `<span>${escapeHtml(formatDate(entry.date))}</span>` : ""}</p>
        <a class="writing-row__main" href="${escapeAttr(entry.url)}">
          <span>
            <strong>${escapeHtml(entry.title)}</strong>
            ${entry.summary ? `<small>${escapeHtml(entry.summary)}</small>` : ""}
          </span>
          <span aria-hidden="true">→</span>
        </a>
      </article>
    `;
  }

  function setupFilters() {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.writingFilter || "all";

        filterButtons.forEach((item) => {
          item.setAttribute(
            "aria-pressed",
            String(item === button)
          );
        });

        renderArchive(filter);
      });
    });
  }

  function safeSlug(value) {
    const slug = String(value || "").trim().toLowerCase();
    return /^[a-z0-9-]+$/.test(slug) ? slug : "";
  }

  function dateValue(value) {
    const timestamp = new Date(value || 0).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
