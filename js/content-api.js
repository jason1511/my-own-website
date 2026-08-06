// js/content-api.js
(() => {
  /* ---------------- D1 PROJECTS RENDERING ---------------- */

  async function loadProjectsFromD1() {
    const container = document.querySelector("[data-projects-list]");
    if (!container) return;

    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`Projects API failed: ${res.status}`);

      const data = await res.json();
      if (!data.ok || !Array.isArray(data.projects)) {
        throw new Error("Invalid projects API response");
      }

      const projects = container.hasAttribute("data-featured-only")
        ? data.projects.filter((project) => Boolean(project.is_featured))
        : data.projects;

      container.innerHTML = projects.length
        ? projects.map(renderProjectCard).join("")
        : renderEmptyCard("No projects are available yet.");
    } catch (error) {
      console.warn("D1 projects unavailable:", error);
      // Keep existing hardcoded content if API fails
    }
  }

  function renderProjectCard(project) {
    const githubRepo = repoFromUrl(project.github_url);
    const techTags = splitTags(project.tech_stack)
      .map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`)
      .join("");

    const githubUrl = safeExternalUrl(project.github_url);
    const liveUrl = safeExternalUrl(project.live_url);

    const githubLink = githubUrl
      ? `<a class="btn btn--small" href="${escapeAttr(githubUrl)}" target="_blank" rel="noopener">GitHub</a>`
      : "";

    const liveLink = liveUrl
      ? `<a class="btn btn--small btn--primary" href="${escapeAttr(liveUrl)}" target="_blank" rel="noopener">Live Demo</a>`
      : "";

    const caseStudyLink = isBikeStoreProject(project, githubRepo)
      ? `<a class="btn btn--small btn--primary" href="bike-store.html">Case Study</a>`
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

    const actions = [caseStudyLink, liveLink, githubLink].filter(Boolean).join("");

    return `
      <article class="card${githubRepo ? " repo-card" : ""}"${
        githubRepo ? ` data-gh-repo="${escapeAttr(githubRepo)}"` : ""
      }>
        <header>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="card__meta">${escapeHtml(project.tech_stack || project.type)}</p>
        </header>

        <p>${escapeHtml(project.summary)}</p>

        ${techTags ? `<ul class="tag-list">${techTags}</ul>` : ""}

        ${stats}

        ${actions ? `<div class="card__actions">${actions}</div>` : ""}
      </article>
    `;
  }

  /* ---------------- D1 WORKSHOP RENDERING ---------------- */

  async function loadWorkshopFromD1() {
    const container = document.querySelector("[data-workshop-list]");
    if (!container) return;

    try {
      const res = await fetch("/api/workshop");
      if (!res.ok) throw new Error(`Workshop API failed: ${res.status}`);

      const data = await res.json();
      if (!data.ok || !Array.isArray(data.workshop_items)) {
        throw new Error("Invalid workshop API response");
      }

      container.innerHTML = data.workshop_items.length
        ? data.workshop_items.map(renderWorkshopCard).join("")
        : renderEmptyCard("No workshop items are available yet.");
    } catch (error) {
      console.warn("D1 workshop unavailable:", error);
      // Keep existing hardcoded content if API fails
    }
  }

  function renderWorkshopCard(item) {
    const workshopUrl = safeExternalUrl(item.workshop_url);

    return `
      <article class="card workshop-card" data-workshop-id="${escapeAttr(item.steam_id)}">
        <header>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="card__meta">${escapeHtml(item.game)} · Steam Workshop</p>
        </header>

        <p>${escapeHtml(item.description)}</p>

        <ul class="tag-list workshop-stats">
          <li class="tag" data-stat="views">— views</li>
          <li class="tag" data-stat="subs">— subscribers</li>
          <li class="tag" data-stat="favs">— favorites</li>
        </ul>

        ${
          workshopUrl
            ? `<div class="card__actions">
                <a
                  class="btn btn--small btn--primary"
                  href="${escapeAttr(workshopUrl)}"
                  target="_blank"
                  rel="noopener"
                >
                  View on Steam
                </a>
              </div>`
            : ""
        }
      </article>
    `;
  }

  /* ---------------- HELPERS ---------------- */

  function splitTags(value) {
    if (!value) return [];
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function repoFromUrl(url) {
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) return "";

    try {
      const parsed = new URL(safeUrl);
      if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) {
        return "";
      }

      const [owner, repository] = parsed.pathname
        .split("/")
        .filter(Boolean)
        .slice(0, 2);

      return owner && repository ? `${owner}/${repository}` : "";
    } catch {
      return "";
    }
  }

  function safeExternalUrl(value) {
    if (!value) return "";

    try {
      const parsed = new URL(String(value).trim());
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
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
      repo === "jason1511/bike-store-project"
    );
  }

  function renderEmptyCard(message) {
    return `<article class="card"><p>${escapeHtml(message)}</p></article>`;
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

  Promise.all([loadProjectsFromD1(), loadWorkshopFromD1()]).finally(() => {
    document.dispatchEvent(new CustomEvent("portfolio:content-loaded"));
  });
})();