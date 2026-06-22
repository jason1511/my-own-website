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

      container.innerHTML = data.projects.map(renderProjectCard).join("");
    } catch (error) {
      console.warn("D1 projects unavailable:", error);
      // Keep existing hardcoded content if API fails
    }
  }

  function renderProjectCard(project) {
    const techTags = splitTags(project.tech_stack)
      .map((tag) => `<li class="tag">${escapeHtml(tag)}</li>`)
      .join("");

    const githubLink = project.github_url
      ? `<a class="btn btn--small" href="${escapeAttr(project.github_url)}" target="_blank" rel="noopener">GitHub</a>`
      : "";

    const caseStudyLink =
      project.slug === "bike-store"
        ? `<a class="btn btn--small btn--primary" href="bike-store.html">Case Study</a>`
        : "";

    return `
      <article class="card repo-card" data-gh-repo="${repoFromUrl(project.github_url)}">
        <header>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="card__meta">${escapeHtml(project.tech_stack || project.type)}</p>
        </header>

        <p>${escapeHtml(project.summary)}</p>

        <ul class="tag-list">
          ${techTags}
        </ul>

        <ul class="tag-list repo-stats" aria-label="GitHub stats">
          <li class="tag" data-gh="stars">— stars</li>
          <li class="tag" data-gh="forks">— forks</li>
          <li class="tag" data-gh="updated">— updated</li>
        </ul>

        <div class="card__actions">
          ${caseStudyLink}
          ${githubLink}
        </div>
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

      container.innerHTML = data.workshop_items.map(renderWorkshopCard).join("");
    } catch (error) {
      console.warn("D1 workshop unavailable:", error);
      // Keep existing hardcoded content if API fails
    }
  }

  function renderWorkshopCard(item) {
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

        <div class="card__actions">
          <a
            class="btn btn--small btn--primary"
            href="${escapeAttr(item.workshop_url)}"
            target="_blank"
            rel="noopener"
          >
            View on Steam
          </a>
        </div>
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
    if (!url || !url.includes("github.com/")) return "";
    return url.replace("https://github.com/", "").replace(/\/$/, "");
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