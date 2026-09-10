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
    a.className = "hobby-external-link";
    a.textContent = label;
    a.href = url;
    if (download) a.setAttribute("download", "");
    else { a.target = "_blank"; a.rel = "noopener"; }
    document.querySelector("[data-hobby-actions]").append(a);
    document.querySelector("[data-hobby-links-section]").hidden = false;
  }
  function renderFiles(item) {
    let entries = item.files;
    if (typeof entries === "string") { try { entries = JSON.parse(entries); } catch { entries = null; } }
    if (!Array.isArray(entries)) entries = item.download_url ? [{ url: item.download_url }] : [];
    entries = [...entries];
    const external = safeUrl(item.workshop_url);
    if (external && /\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(new URL(external).pathname) && !entries.some(file => safeUrl(file.url) === external)) entries.push({ url: external });
    entries.sort((a, b) => String(b.released_at || "").localeCompare(String(a.released_at || "")));
    const list = document.querySelector("[data-hobby-files]");
    for (const file of entries.slice(0, 100)) {
      const url = safeUrl(file?.url); if (!url) continue;
      let name = file.filename;
      if (!name) { try { name = decodeURIComponent(new URL(url).pathname.split("/").pop()).replace(/^[a-f0-9-]{36}-/i, ""); } catch { name = "Archive"; } }
      const row = document.createElement("article"); row.className = "hobby-release-row";
      const heading = document.createElement("h3");
      const link = document.createElement("a"); link.href = url; link.textContent = name;
      if (new URL(url).origin === location.origin) link.setAttribute("download", name); else { link.target = "_blank"; link.rel = "noopener"; }
      heading.append(link); row.append(heading);
      const metadata = document.createElement("div"); metadata.className = "hobby-release-meta";
      if (file.version) { const version = document.createElement("span"); version.textContent = `Version ${file.version}`; metadata.append(version); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(file.released_at || "") && Number.isFinite(Date.parse(file.released_at))) {
        const date = document.createElement("time"); date.dateTime = file.released_at;
        date.textContent = new Date(file.released_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); metadata.append(date);
      }
      if (Number(file.size) > 0) { const size = document.createElement("span"); size.textContent = window.formatFileSize(file.size); metadata.append(size); }
      if (metadata.children.length) row.append(metadata);
      if (file.notes) { const notes = document.createElement("p"); notes.className = "hobby-release-notes"; notes.textContent = file.notes; row.append(notes); }
      list.append(row);
    }
    document.querySelector("[data-hobby-files-section]").hidden = !list.children.length;
  }
  function render(item) {
    document.title = `${item.title || "Hobby Project"} | Jason Leonard`;
    document.querySelector('meta[name="description"]').content = String(item.description || "").slice(0, 300);
    text("[data-hobby-title]", item.title);
    text("[data-hobby-game]", item.game || "Hobby project");
    text("[data-hobby-summary]", item.description);
    renderFiles(item);
    const external = safeUrl(item.workshop_url);
    if (external && !/\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(new URL(external).pathname)) {
      const url = new URL(external);
      const label = ["steamcommunity.com", "www.steamcommunity.com"].includes(url.hostname) ? "View on Steam ↗" : ["drive.google.com", "docs.google.com"].includes(url.hostname) ? "Google Drive ↗" : "Visit project ↗";
      addLink(label, external);
    }
    const imageUrl = safeUrl(item.image_key);
    if (imageUrl) {
      const img = document.querySelector("[data-hobby-image]");
      img.src = imageUrl; img.alt = item.image_alt || item.title || "Project cover";
      document.querySelector("[data-hobby-cover]").hidden = false;
    }
    let dependencies = item.dependencies || [];
    try { if (typeof dependencies === "string") dependencies = JSON.parse(dependencies); } catch { dependencies = []; }
    const dependencyList = document.querySelector("[data-hobby-dependencies]");
    for (const entry of (Array.isArray(dependencies) ? dependencies : []).slice(0, 30)) {
      const url = safeUrl(entry?.url); if (!url || !entry.name) continue;
      const li = document.createElement("li"), a = document.createElement("a");
      a.href = url; a.textContent = entry.name; a.target = "_blank"; a.rel = "noopener";
      li.append(a); dependencyList.append(li);
    }
    document.querySelector("[data-hobby-dependencies-section]").hidden = !dependencyList.children.length;
    const body = String(item.body || "").split(/\r?\n/).filter(line => {
      const match = line.match(/^\s*mod asli\s*:\s*(https?:\/\/\S+)\s*$/i);
      return !match || !Array.isArray(dependencies) || !dependencies.some(entry => safeUrl(entry.url) === safeUrl(match[1]));
    }).join("\n").trim();
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
