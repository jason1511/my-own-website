// js/stats.js
(() => {
  /* ---------------- STEAM WORKSHOP STATS ---------------- */

  async function loadWorkshopStats() {
    const cards = document.querySelectorAll(".workshop-card[data-workshop-id]");
    if (cards.length === 0) return;

    const ids = Array.from(cards)
      .map((card) => card.getAttribute("data-workshop-id"))
      .filter(Boolean);

    const url = "/workshop-stats?ids=" + encodeURIComponent(ids.join(","));

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);

      const stats = await res.json();

      cards.forEach((card) => {
        const id = card.getAttribute("data-workshop-id");
        const itemStats = stats[id];
        if (!itemStats) return;

        const views = card.querySelector('[data-stat="views"]');
        const subs = card.querySelector('[data-stat="subs"]');
        const favs = card.querySelector('[data-stat="favs"]');

        if (views) views.textContent = `${formatNumber(itemStats.views)} views`;
        if (subs) subs.textContent = `${formatNumber(itemStats.subscriptions)} subscribers`;
        if (favs) favs.textContent = `${formatNumber(itemStats.favorited)} favorites`;
      });
    } catch (error) {
      console.warn("Workshop stats unavailable:", error);
    }
  }

  /* ---------------- GITHUB REPO STATS ---------------- */

  async function loadGitHubStats() {
    const cards = document.querySelectorAll(".repo-card[data-gh-repo]");
    if (cards.length === 0) return;

    const repos = Array.from(cards)
      .map((card) => card.getAttribute("data-gh-repo"))
      .filter(Boolean);

    const url = "/github-repo-stats?repos=" + encodeURIComponent(repos.join(","));

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GitHub stats fetch failed: ${res.status}`);

      const statsByRepo = await res.json();

      cards.forEach((card) => {
        const repo = card.getAttribute("data-gh-repo");
        const repoStats = statsByRepo[repo];

        if (!repoStats || repoStats.error) return;

        const stars = card.querySelector('[data-gh="stars"]');
        const forks = card.querySelector('[data-gh="forks"]');
        const updated = card.querySelector('[data-gh="updated"]');

        if (stars) stars.textContent = `${formatNumber(repoStats.stargazers_count)} stars`;
        if (forks) forks.textContent = `${formatNumber(repoStats.forks_count)} forks`;
        if (updated) updated.textContent = `${formatDate(repoStats.updated_at)} updated`;
      });
    } catch (error) {
      console.warn("GitHub repo stats unavailable:", error);
    }
  }

  /* ---------------- SHARED HELPERS ---------------- */

  function formatNumber(value) {
    return Number.isFinite(value) ? value.toLocaleString() : "—";
  }

  function formatDate(isoDate) {
    if (!isoDate) return "—";

    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  }

  function loadAllStats() {
    loadWorkshopStats();
    loadGitHubStats();
  }

  // Run once for hardcoded content.
  loadAllStats();

  // Run again after D1 content is rendered.
  document.addEventListener("portfolio:content-loaded", loadAllStats);
})();