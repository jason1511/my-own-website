// js/content-api.js
(() => {
  /* ---------------- D1 PROJECTS RENDERING ---------------- */

  async function loadProjectsFromD1() {
    const container = document.querySelector("[data-projects-list]");
    if (!container) return;

    try {
      const response = await fetch("/api/projects");

      if (!response.ok) {
        throw new Error(`Projects API failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.projects)) {
        throw new Error("Invalid projects API response");
      }

      const projects = container.hasAttribute("data-featured-only")
        ? data.projects.filter((project) =>
            Boolean(project.is_featured)
          )
        : data.projects;

      const renderProject = container.hasAttribute("data-home-projects")
        ? renderPortfolioProject
        : container.hasAttribute("data-project-archive")
          ? renderArchiveProject
          : renderProjectCard;

      container.innerHTML = projects.length
        ? projects.map(renderProject).join("")
        : renderEmptyCard("No projects are available yet.");
    } catch (error) {
      console.warn("D1 projects unavailable:", error);
      // Keep the existing hardcoded content if the API fails.
    }
  }

  function renderPortfolioProject(project, index) {
    const githubUrl = safeExternalUrl(project.github_url);
    const liveUrl = safeExternalUrl(project.live_url);
    const imageUrl = safeImageUrl(project.image_key);
    const projectSlug = safeProjectSlug(project.slug);
    const projectCode = "JL–" + String(index + 1).padStart(3, "0");
    const projectType = formatProjectType(project.type);
    const tags = splitTags(project.tech_stack).slice(0, 6);
    const detailUrl = projectSlug
      ? "project.html?slug=" + encodeURIComponent(projectSlug)
      : "";
    const primaryUrl = detailUrl || liveUrl || githubUrl;

    const links = [
      detailUrl
        ? `<a href="${escapeAttr(detailUrl)}">
            Project details <span aria-hidden="true">→</span>
          </a>`
        : "",
      liveUrl
        ? `<a href="${escapeAttr(liveUrl)}" target="_blank" rel="noopener">
            Live project <span aria-hidden="true">↗</span>
          </a>`
        : "",
      githubUrl
        ? `<a href="${escapeAttr(githubUrl)}" target="_blank" rel="noopener">
            GitHub <span aria-hidden="true">↗</span>
          </a>`
        : "",
    ].filter(Boolean).join("");

    const media = imageUrl && primaryUrl
      ? `<a
          class="portfolio-project__media"
          href="${escapeAttr(primaryUrl)}"
          ${!detailUrl ? 'target="_blank" rel="noopener"' : ""}
        >
          <img
            class="portfolio-project__image"
            src="${escapeAttr(imageUrl)}"
            alt="${escapeAttr(project.title + " project thumbnail")}"
            loading="lazy"
          />
        </a>`
      : imageUrl
        ? `<div class="portfolio-project__media">
            <img
              class="portfolio-project__image"
              src="${escapeAttr(imageUrl)}"
              alt="${escapeAttr(project.title + " project thumbnail")}"
              loading="lazy"
            />
          </div>`
        : `<div
            class="portfolio-project__media portfolio-project__media--empty"
            aria-hidden="true"
          >
            <span>${projectCode}</span>
          </div>`;

    return `
      <article class="portfolio-project">
        ${media}
        <div class="portfolio-project__body">
          <div class="portfolio-project__topline">
            <span>${projectCode}</span>
            <span>${escapeHtml(projectType)}</span>
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.summary)}</p>
          ${tags.length
            ? `<ul class="portfolio-stack" aria-label="Technology">
                ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
              </ul>`
            : ""}
          ${links ? `<div class="portfolio-project__links">${links}</div>` : ""}
        </div>
      </article>
    `;
  }

  function formatProjectType(value) {
    return String(value || "Project")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function renderProjectCard(project) {
    const githubRepo = repoFromUrl(project.github_url);
    const projectSlug = safeProjectSlug(project.slug);

    const techTags = splitTags(project.tech_stack)
      .map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`)
      .join("");

    const githubUrl = safeExternalUrl(project.github_url);
    const liveUrl = safeExternalUrl(project.live_url);

    const detailLink = projectSlug
      ? `
        <a
          class="btn btn--small btn--primary"
          href="project.html?slug=${encodeURIComponent(projectSlug)}"
        >
          Project Details
        </a>
      `
      : "";

    const caseStudyLink = isBikeStoreProject(project, githubRepo)
      ? `
        <a class="btn btn--small" href="bike-store.html">
          Detailed Case Study
        </a>
      `
      : "";

    const liveLink = liveUrl
      ? `
        <a
          class="btn btn--small"
          href="${escapeAttr(liveUrl)}"
          target="_blank"
          rel="noopener"
        >
          Live Demo
        </a>
      `
      : "";

    const githubLink = githubUrl
      ? `
        <a
          class="btn btn--small"
          href="${escapeAttr(githubUrl)}"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
      `
      : "";

    const stats = githubRepo
      ? `
        <ul class="tag-list repo-stats" aria-label="GitHub stats">
          <li class="tag" data-gh="stars">— stars</li>
          <li class="tag" data-gh="forks">— forks</li>
          <li class="tag" data-gh="updated">— updated</li>
        </ul>
      `
      : "";

    const actions = [
      detailLink,
      caseStudyLink,
      liveLink,
      githubLink,
    ]
      .filter(Boolean)
      .join("");

    return `
      <article
        class="card${githubRepo ? " repo-card" : ""}"
        ${
          githubRepo
            ? `data-gh-repo="${escapeAttr(githubRepo)}"`
            : ""
        }
      >
        <header>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="card__meta">
            ${escapeHtml(project.tech_stack || project.type)}
          </p>
        </header>

        <p>${escapeHtml(project.summary)}</p>

        ${techTags ? `<ul class="tag-list">${techTags}</ul>` : ""}

        ${stats}

        ${
          actions
            ? `<div class="card__actions">${actions}</div>`
            : ""
        }
      </article>
    `;
  }

  function renderArchiveProject(project) {
    const githubUrl = safeExternalUrl(project.github_url);
    const liveUrl = safeExternalUrl(project.live_url);
    const projectSlug = safeProjectSlug(project.slug);
    const detailUrl = projectSlug
      ? "project.html?slug=" + encodeURIComponent(projectSlug)
      : "";
    const tags = splitTags(project.tech_stack).slice(0, 8);
    const links = [
      detailUrl
        ? `<a href="${escapeAttr(detailUrl)}">Details <span aria-hidden="true">→</span></a>`
        : "",
      liveUrl
        ? `<a href="${escapeAttr(liveUrl)}" target="_blank" rel="noopener">Live <span aria-hidden="true">↗</span></a>`
        : "",
      githubUrl
        ? `<a href="${escapeAttr(githubUrl)}" target="_blank" rel="noopener">GitHub <span aria-hidden="true">↗</span></a>`
        : "",
    ].filter(Boolean).join("");

    return `
      <article class="archive-row">
        <div class="archive-row__project">
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.summary)}</p>
        </div>
        <p class="archive-row__category">${escapeHtml(formatProjectType(project.type))}</p>
        <ul class="archive-tags" aria-label="Built with">
          ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
        </ul>
        <div class="archive-row__links">${links}</div>
      </article>
    `;
  }

  /* ---------------- D1 WORKSHOP RENDERING ---------------- */

  async function loadWorkshopFromD1() {
    const container = document.querySelector("[data-workshop-list]");
    if (!container) return;

    try {
      const response = await fetch("/api/workshop");

      if (!response.ok) {
        throw new Error(`Workshop API failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.workshop_items)) {
        throw new Error("Invalid workshop API response");
      }

      const renderWorkshop = container.hasAttribute("data-workshop-archive")
        ? renderArchiveWorkshop
        : renderWorkshopCard;

      container.innerHTML = data.workshop_items.length
        ? data.workshop_items.map(renderWorkshop).join("")
        : renderEmptyCard("No workshop items are available yet.");
    } catch (error) {
      console.warn("D1 workshop unavailable:", error);
      // Keep the existing hardcoded content if the API fails.
    }
  }

  function renderArchiveWorkshop(item) {
    const workshopUrl = safeExternalUrl(item.workshop_url);

    return `
      <article
        class="archive-row workshop-card"
        data-workshop-id="${escapeAttr(item.steam_id)}"
      >
        <div class="archive-row__project">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <p class="archive-row__category">${escapeHtml(item.game)}</p>
        <ul class="archive-stats" aria-label="Workshop activity">
          <li data-stat="views">— views</li>
          <li data-stat="subs">— subscribers</li>
          <li data-stat="favs">— favorites</li>
        </ul>
        <div class="archive-row__links">
          ${workshopUrl
            ? `<a href="${escapeAttr(workshopUrl)}" target="_blank" rel="noopener">Steam <span aria-hidden="true">↗</span></a>`
            : ""}
        </div>
      </article>
    `;
  }

  function renderWorkshopCard(item) {
    const workshopUrl = safeExternalUrl(item.workshop_url);

    return `
      <article
        class="card workshop-card"
        data-workshop-id="${escapeAttr(item.steam_id)}"
      >
        <header>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="card__meta">
            ${escapeHtml(item.game)} · Steam Workshop
          </p>
        </header>

        <p>${escapeHtml(item.description)}</p>

        <ul class="tag-list workshop-stats">
          <li class="tag" data-stat="views">— views</li>
          <li class="tag" data-stat="subs">— subscribers</li>
          <li class="tag" data-stat="favs">— favorites</li>
        </ul>

        ${
          workshopUrl
            ? `
              <div class="card__actions">
                <a
                  class="btn btn--small btn--primary"
                  href="${escapeAttr(workshopUrl)}"
                  target="_blank"
                  rel="noopener"
                >
                  View on Steam
                </a>
              </div>
            `
            : ""
        }
      </article>
    `;
  }

  /* ---------------- D1 CASE STUDIES RENDERING ---------------- */

  async function loadCaseStudiesFromD1() {
    const container = document.querySelector("[data-case-studies-list]");
    if (!container) return;

    try {
      const response = await fetch("/api/case-studies");

      if (!response.ok) {
        throw new Error(`Case studies API failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.case_studies)) {
        throw new Error("Invalid case studies API response");
      }

      // Keep the existing hand-written cards until the first D1 case study is published.
      if (data.case_studies.length === 0) return;

      container.innerHTML = data.case_studies
        .map(renderCaseStudyCard)
        .join("");
    } catch (error) {
      console.warn("D1 case studies unavailable:", error);
      // Keep the hand-written cards as a resilient public fallback.
    }
  }

  function renderCaseStudyCard(caseStudy) {
    const techTags = splitTags(caseStudy.tech_stack)
      .map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`)
      .join("");
    const githubUrl = safeExternalUrl(caseStudy.github_url);
    const liveUrl = safeExternalUrl(caseStudy.live_url);
    const imageUrl = safeImageUrl(caseStudy.image_key);
    const slug = safeProjectSlug(caseStudy.slug);

    const actions = [
      slug
        ? `<a
            class="btn btn--small btn--primary"
            href="case-study.html?slug=${encodeURIComponent(slug)}"
          >
            Read Case Study
          </a>`
        : "",
      liveUrl
        ? `<a
            class="btn btn--small"
            href="${escapeAttr(liveUrl)}"
            target="_blank"
            rel="noopener"
          >
            Live Demo
          </a>`
        : "",
      githubUrl
        ? `<a
            class="btn btn--small"
            href="${escapeAttr(githubUrl)}"
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    return `
      <article class="card case-study-card">
        ${
          imageUrl
            ? `<img
                class="case-study-card__image"
                src="${escapeAttr(imageUrl)}"
                alt="${escapeAttr(caseStudy.cover_image_alt || "")}"
                loading="lazy"
              />`
            : ""
        }
        <header>
          <h3>${escapeHtml(caseStudy.title)}</h3>
          <p class="card__meta">
            ${escapeHtml(caseStudy.project_title || "Project case study")}
          </p>
        </header>

        <p>${escapeHtml(caseStudy.summary)}</p>

        ${techTags ? `<ul class="tag-list">${techTags}</ul>` : ""}

        ${actions ? `<div class="card__actions">${actions}</div>` : ""}
      </article>
    `;
  }

  /* ---------------- HELPERS ---------------- */

  function splitTags(value) {
    if (!value) return [];

    return String(value)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function repoFromUrl(url) {
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) return "";

    try {
      const parsed = new URL(safeUrl);

      const allowedHosts = ["github.com", "www.github.com"];

      if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
        return "";
      }

      const [owner, repository] = parsed.pathname
        .split("/")
        .filter(Boolean)
        .slice(0, 2);

      return owner && repository
        ? `${owner}/${repository}`
        : "";
    } catch {
      return "";
    }
  }

  function safeProjectSlug(value) {
    const slug = String(value || "").trim().toLowerCase();

    return /^[a-z0-9-]+$/.test(slug) ? slug : "";
  }

  function safeExternalUrl(value) {
    if (!value) return "";

    try {
      const parsed = new URL(String(value).trim());

      return ["http:", "https:"].includes(parsed.protocol)
        ? parsed.href
        : "";
    } catch {
      return "";
    }
  }

  function safeImageUrl(value) {
    if (!value) return "";

    try {
      const parsed = new URL(String(value).trim(), window.location.origin);
      return ["http:", "https:"].includes(parsed.protocol)
        ? parsed.href
        : "";
    } catch {
      return "";
    }
  }

  function isBikeStoreProject(project, githubRepo) {
    const slug = String(project.slug || "").toLowerCase();
    const repo = String(githubRepo || "").toLowerCase();

    return (
      slug === "bike-store" ||
      slug === "bike-store-inventory-sales-management-app" ||
      slug === "bike-store-inventory-sales-system" ||
      repo === "jason1511/bike-store-project"
    );
  }

  function renderEmptyCard(message) {
    return `
      <article class="card">
        <p>${escapeHtml(message)}</p>
      </article>
    `;
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

  Promise.all([
    loadProjectsFromD1(),
    loadCaseStudiesFromD1(),
    loadWorkshopFromD1(),
  ]).finally(() => {
    document.dispatchEvent(
      new CustomEvent("portfolio:content-loaded")
    );
  });
})();
