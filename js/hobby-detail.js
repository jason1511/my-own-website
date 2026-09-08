(() => {
  const status = document.querySelector("[data-hobby-status]");
  const article = document.querySelector("[data-hobby-detail]");
  if (!status || !article) return;
  const id = new URLSearchParams(location.search).get("id") || "";
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    status.textContent = "No valid hobby project was selected. Use the link above to choose one.";
    return;
  }
  const text = (selector, value) => { document.querySelector(selector).textContent = value || ""; };
  function safeUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, location.origin);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }
  function addLink(label, url, download = false) {
    if (!url) return;
    const a = document.createElement("a");
    a.className = "btn btn--small";
    a.textContent = label;
    a.href = url;
    if (download) a.setAttribute("download", "");
    else { a.target = "_blank"; a.rel = "noopener"; }
    document.querySelector("[data-hobby-actions]").append(a);
  }
  function render(item) {
    document.title = `${item.title || "Hobby Project"} | Jason Leonard`;
    document.querySelector('meta[name="description"]').content = String(item.description || "").slice(0, 300);
    text("[data-hobby-title]", item.title);
    text("[data-hobby-game]", item.game || "Hobby project");
    text("[data-hobby-summary]", item.description);
    if (/^\/downloads\/[a-f0-9-]{36}-[a-zA-Z0-9._-]+\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(item.download_url || "")) addLink("Download ↓", item.download_url, true);
    const external = safeUrl(item.workshop_url);
    if (external) {
      const url = new URL(external);
      const label = ["steamcommunity.com", "www.steamcommunity.com"].includes(url.hostname) ? "View on Steam ↗" : ["drive.google.com", "docs.google.com"].includes(url.hostname) ? "Google Drive ↗" : /\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(url.pathname) ? "Download ↗" : "Visit project ↗";
      addLink(label, external);
    }
    const imageUrl = safeUrl(item.image_key);
    if (imageUrl) {
      const img = document.querySelector("[data-hobby-image]");
      img.src = imageUrl; img.alt = item.image_alt || item.title || "Project cover";
      document.querySelector("[data-hobby-cover]").hidden = false;
    }
    const body = String(item.body || "").trim();
    if (body) {
      const container = document.querySelector("[data-hobby-description]");
      for (const paragraph of body.split(/\n\s*\n/)) {
        const p = document.createElement("p"); p.textContent = paragraph; p.style.whiteSpace = "pre-line"; container.append(p);
      }
      document.querySelector("[data-hobby-body]").hidden = false;
    }
    let gallery = [];
    try { gallery = typeof item.screenshots === "string" ? JSON.parse(item.screenshots || "[]") : item.screenshots || []; } catch { /* Existing entries may not have screenshots. */ }
    const screenshots = document.querySelector("[data-hobby-screenshots]");
    for (const entry of (Array.isArray(gallery) ? gallery : []).slice(0, 30)) {
      const url = safeUrl(entry?.image_url); if (!url) continue;
      const figure = document.createElement("figure"); figure.className = "article-media";
      const img = document.createElement("img"); img.src = url; img.alt = entry.image_alt || item.title || "Project screenshot"; img.loading = "lazy";
      figure.append(img);
      if (entry.image_caption) { const caption = document.createElement("figcaption"); caption.textContent = entry.image_caption; figure.append(caption); }
      screenshots.append(figure);
    }
    document.querySelector("[data-hobby-gallery-section]").hidden = !screenshots.children.length;
    status.hidden = true; article.hidden = false;
    document.dispatchEvent(new CustomEvent("portfolio:content-loaded"));
  }
  async function load() {
    try {
      const response = await fetch(`/api/workshop/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.workshop_item) throw new Error(response.status === 404 ? "This hobby project is unavailable or is no longer published." : "Unable to load this hobby project. Please refresh to try again.");
      render(data.workshop_item);
    } catch (error) { status.textContent = error.message || "Unable to load this hobby project. Please refresh to try again."; }
  }
  load();
})();
