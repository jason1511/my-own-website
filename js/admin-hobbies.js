(() => {
  const form = document.getElementById("adminWorkshopForm");
  if (!form) return;
  const gallery = form.querySelector("[data-hobby-gallery]");
  const area = form.querySelector("[data-mod-drop]");
  const fileInput = area.querySelector("[data-mod-file]");
  const status = area.querySelector("[data-mod-status]");
  const progress = area.querySelector("progress");
  const cancel = area.querySelector("[data-mod-cancel]");
  const attachment = form.elements.download_url;
  let busy = false, queueBusy = false, stopQueue = false, controller = null, dragged = null, sequence = 0;
  const attachments = form.querySelector("[data-hobby-attachments]");
  const uploadVersion = form.querySelector("[data-upload-version]");
  const uploadDate = form.querySelector("[data-upload-date]");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  uploadDate.value = today();
  const dirty = () => form.dispatchEvent(new Event("input", { bubbles: true }));
  const escape = value => String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const sizeText = window.formatFileSize;
  async function api(action, options = {}, signal) {
    const response = await fetch(`/api/admin/mods?action=${action}`, { credentials: "same-origin", ...options, signal });
    const data = await response.json();
    if (!response.ok || !data.ok) throw Object.assign(new Error(data.error || "Request failed."), { status: response.status });
    return data;
  }
  function renumber() {
    [...gallery.children].forEach((row, i) => {
      row.querySelector("h4").textContent = `Image ${i + 1}`;
      row.querySelector("[data-up]").disabled = i === 0;
      row.querySelector("[data-down]").disabled = i === gallery.children.length - 1;
    });
  }
  function add(image = {}, notify = true) {
    if (gallery.children.length >= 30) return;
    const id = `hobby-gallery-image-${++sequence}`;
    const row = document.createElement("article");
    row.className = "admin-project-gallery-item";
    row.innerHTML = `
      <div class="admin-project-gallery-item__header"><h4>Image</h4><div class="admin-project-gallery-item__actions">
        <button class="btn btn--small" type="button" draggable="true" data-drag aria-label="Drag to reorder image">⠿</button>
        <button class="btn btn--small" type="button" data-up>Move Up</button><button class="btn btn--small" type="button" data-down>Move Down</button>
        <button class="btn btn--small btn--danger" type="button" data-remove>Remove</button></div></div>
      <div class="admin-project-gallery-item__fields">
        <label>Image path or URL<input id="${id}" data-field="image_url" type="text" value="${escape(image.image_url)}" placeholder="/media/image.webp or https://…" /></label>
        <div class="admin-media-picker" data-media-picker tabindex="0">
          <input data-media-file type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
          <button class="btn btn--small" type="button" data-media-upload data-media-target="${id}">Upload Screenshot</button>
          <button class="btn btn--small" type="button" data-media-choose>Choose from Media</button>
          <small>Focus here and paste an image with Ctrl+V.</small><span data-media-upload-status></span>
        </div>
        <label>Alt text<input data-field="image_alt" type="text" maxlength="300" value="${escape(image.image_alt)}" /></label>
        <label>Caption<input data-field="image_caption" type="text" maxlength="1000" value="${escape(image.image_caption)}" /></label>
      </div>`;
    row.querySelector("[data-up]").onclick = () => { if (row.previousElementSibling) gallery.insertBefore(row, row.previousElementSibling); renumber(); dirty(); };
    row.querySelector("[data-down]").onclick = () => { if (row.nextElementSibling) gallery.insertBefore(row.nextElementSibling, row); renumber(); dirty(); };
    row.querySelector("[data-remove]").onclick = () => { row.remove(); renumber(); dirty(); };
    row.querySelector("[data-drag]").addEventListener("dragstart", event => { dragged = row; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); });
    row.addEventListener("dragover", event => { if (dragged) event.preventDefault(); });
    row.addEventListener("drop", event => {
      if (!dragged) return; event.preventDefault();
      if (dragged !== row) gallery.insertBefore(dragged, event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2 ? row : row.nextSibling);
      dragged = null; renumber(); dirty();
    });
    row.addEventListener("dragend", () => { dragged = null; });
    gallery.append(row); renumber(); if (notify) dirty();
  }
  function collectFiles() {
    return [...attachments.children].map(row => ({ ...row.fileRecord,
      ...Object.fromEntries([...row.querySelectorAll("[data-release-field]")].map(input => [input.dataset.releaseField, input.value.trim()]))
    }));
  }
  function syncAttachment() { attachment.value = collectFiles()[0]?.url || ""; }
  function addFile(file, notify = true, prepend = true) {
    if ([...attachments.children].some(row => row.fileRecord.url === file.url)) {
      if (notify) status.textContent = "This file is already attached. Upload a separate file for a new version.";
      return false;
    }
    if (attachments.children.length >= 100) { status.textContent = "A project can contain up to 100 files."; return false; }
    const row = document.createElement("article"); row.className = "hobby-attachment-editor";
    const name = file.filename || decodeURIComponent(file.url.split("/").pop()).replace(/^[a-f0-9-]{36}-/i, "");
    row.fileRecord = { ...file, filename: name };
    row.innerHTML = `<div class="hobby-file-row"><strong>${escape(name)}</strong><span>${file.size ? sizeText(file.size) : ""}</span><button class="btn btn--small" type="button" data-remove-version>Remove attachment</button></div>
      <div class="hobby-release-defaults">
        <label>Version<input type="text" data-release-field="version" maxlength="64" value="${escape(file.version)}" placeholder="e.g. 1.2" /></label>
        <label>Release date<input type="date" data-release-field="released_at" value="${escape(file.released_at)}" /></label>
      </div>
      <label>Release notes<textarea rows="2" data-release-field="notes" maxlength="2000" placeholder="Changes, compatibility, or what this file contains">${escape(file.notes)}</textarea></label>`;
    row.querySelector("[data-remove-version]").onclick = () => {
      if (busy || queueBusy) return;
      row.remove(); syncAttachment(); dirty(); status.textContent = "Attachment removed. Save the project to apply; the archive remains available in storage.";
    };
    if (prepend) attachments.prepend(row); else attachments.append(row);
    syncAttachment(); if (notify) dirty(); return true;
  }
  function renderFiles(value, legacyUrl = "") {
    attachments.replaceChildren();
    let entries = value;
    try { if (typeof value === "string") entries = value.trim() ? JSON.parse(value) : null; } catch { entries = null; }
    if (!Array.isArray(entries)) entries = legacyUrl ? [{ url: legacyUrl }] : [];
    entries.forEach(file => addFile(file, false, false)); syncAttachment();
    uploadVersion.value = ""; uploadDate.value = today();
  }
  const dependencies = form.querySelector("[data-hobby-dependencies]");
  function addDependency(entry = {}, notify = true) {
    if (dependencies.children.length >= 30) { status.textContent = "Use up to 30 dependencies."; return; }
    const row = document.createElement("div"); row.className = "hobby-dependency-editor";
    row.innerHTML = `<label>Mod name<input type="text" data-dependency-name maxlength="180" required value="${escape(entry.name)}" placeholder="e.g. HKC Trailers V3" /></label>
      <label>Link<input type="url" data-dependency-url maxlength="2048" required value="${escape(entry.url)}" placeholder="https://…" /></label>
      <button type="button" class="btn btn--small" data-remove-dependency>Remove</button>`;
    row.querySelector("[data-remove-dependency]").onclick = () => { row.remove(); dirty(); };
    dependencies.append(row); if (notify) dirty();
  }
  function renderDependencies(value = []) {
    dependencies.replaceChildren();
    try { const entries = typeof value === "string" ? JSON.parse(value || "[]") : value; if (Array.isArray(entries)) entries.forEach(entry => addDependency(entry, false)); } catch {}
  }
  form.querySelector("[data-add-dependency]").onclick = () => addDependency();
  window.hobbyEditor = {
    renderDependencies,
    collectDependencies: () => [...dependencies.children].map(row => ({ name: row.querySelector("[data-dependency-name]").value.trim(), url: row.querySelector("[data-dependency-url]").value.trim() })),
    collect: () => [...gallery.children].map(row => Object.fromEntries([...row.querySelectorAll("[data-field]")].map(field => [field.dataset.field, field.value.trim()]))).filter(image => image.image_url),
    render(value = []) {
      gallery.replaceChildren();
      try { const entries = typeof value === "string" ? JSON.parse(value || "[]") : value; if (Array.isArray(entries)) entries.forEach(image => add(image, false)); } catch { /* Legacy entries have no gallery. */ }
    },
    collectFiles, renderFiles,
    get busy() { return busy || queueBusy; }
  };
  form.querySelector("[data-hobby-add-image]").onclick = () => add();
  async function uploadOne(file, defaults) {
    if (busy || !file) return;
    if (!/\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(file.name) || !file.size || file.size > 256 * 1024 * 1024) { status.textContent = "Choose a ZIP, RAR, 7Z, SCS, PAK, TAR, or GZ file up to 256 MB."; return; }
    busy = true; controller = new AbortController();
    const signal = controller.signal; let token = "", completed = false;
    fileInput.disabled = true; cancel.hidden = false; progress.hidden = false; progress.value = 0;
    dirty();
    try {
      status.textContent = `Starting ${file.name} (${sizeText(file.size)})…`;
      // Keep the start request alive so cancellation can still abort its allocated upload.
      const start = await api("start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size }) }, AbortSignal.timeout(120000));
      token = start.token;
      signal.throwIfAborted();
      const headers = { "X-Upload-Token": token };
      async function retry(action, options) {
        for (let attempt = 0; ; attempt++) {
          signal.throwIfAborted();
          try { return await api(action, options, AbortSignal.any([signal, AbortSignal.timeout(120000)])); }
          catch (error) { if (signal.aborted || attempt >= 2 || (error.status && error.status < 500 && error.status !== 429)) throw error; status.textContent = "Connection interrupted. Retrying…"; }
        }
      }
      const parts = [];
      for (let offset = 0; offset < file.size; offset += start.chunk_size) {
        const end = Math.min(offset + start.chunk_size, file.size);
        const result = await retry(`part&part=${parts.length + 1}`, { method: "PUT", headers, body: file.slice(offset, end) });
        parts.push(result.part); progress.value = end / file.size * 100;
        status.textContent = `Uploading ${file.name}: ${Math.round(progress.value)}%`;
      }
      const result = await retry("complete", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ parts }) });
      completed = true;
      addFile({ url: result.url, filename: result.filename || file.name, size: result.size, ...defaults });
      status.textContent = `${file.name} uploaded (${sizeText(file.size)}). Save the project to publish its download link.`;
    } catch (error) { status.textContent = signal.aborted ? "Upload cancelled." : error.message; }
    finally {
      if (token && !completed) { try { await api("abort", { method: "DELETE", headers: { "X-Upload-Token": token } }); } catch { /* R2 expires abandoned multipart uploads. */ } }
      busy = false; controller = null; fileInput.disabled = false; fileInput.value = ""; cancel.hidden = true;
    }
    return completed;
  }
  async function upload(selected) {
    if (busy || queueBusy) return;
    const batch = [...selected]; if (!batch.length) return;
    if (batch.length + attachments.children.length > 100) { status.textContent = "A project can contain up to 100 files."; return; }
    queueBusy = true; stopQueue = false;
    const defaults = { version: uploadVersion.value.trim(), released_at: uploadDate.value, notes: "" };
    let done = 0;
    try {
      for (const file of batch) {
        if (stopQueue) break;
        if (!await uploadOne(file, defaults)) break;
        done++;
      }
      if (done === batch.length) status.textContent = `${done} file(s) uploaded. Review versions and save the project.`;
    } finally { queueBusy = false; }
  }
  fileInput.addEventListener("change", () => upload(fileInput.files));
  for (const type of ["dragenter", "dragover"]) area.addEventListener(type, event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); area.classList.add("is-dragging"); } });
  area.addEventListener("dragleave", () => area.classList.remove("is-dragging"));
  area.addEventListener("drop", event => { if (event.dataTransfer.files.length) { event.preventDefault(); area.classList.remove("is-dragging"); upload(event.dataTransfer.files); } });
  cancel.onclick = () => { stopQueue = true; controller?.abort(); };

  form.addEventListener("submit", event => { if (busy || queueBusy) { event.preventDefault(); event.stopImmediatePropagation(); status.textContent = "Wait for the upload to finish, or cancel it before saving."; } }, true);
  window.addEventListener("hashchange", () => { if (busy || queueBusy) { stopQueue = true; controller?.abort(); } });
  window.addEventListener("beforeunload", event => { if (busy || queueBusy) { event.preventDefault(); event.returnValue = ""; } });
  const files = form.querySelector("[data-mod-files]");
  async function listFiles() {
    files.textContent = "Loading archives…";
    try {
      const result = await api("list"); files.replaceChildren();
      for (const file of result.files) {
        const row = document.createElement("div"); row.className = "hobby-file-row";
        const name = document.createElement("span"); name.textContent = `${file.filename} · ${sizeText(file.size)}`;
        const use = document.createElement("button"); use.className = "btn btn--small"; use.type = "button"; use.textContent = "Attach"; use.onclick = () => { if (!busy && !queueBusy) { addFile({ ...file, version: uploadVersion.value.trim(), released_at: uploadDate.value, notes: "" }); } };
        const remove = document.createElement("button"); remove.className = "btn btn--small btn--danger"; remove.type = "button"; remove.textContent = "Delete file";
        remove.onclick = async () => {
          if (busy || queueBusy || !confirm(`Permanently delete ${file.filename}?`)) return;
          try { await api(`file&key=${encodeURIComponent(file.key)}`, { method: "DELETE" }); for (const row of [...attachments.children]) { if (row.fileRecord.url === file.url) row.remove(); } syncAttachment(); dirty(); await listFiles(); }
          catch (error) { status.textContent = error.message; }
        };
        row.append(name, use, remove); files.append(row);
      }
      if (!result.files.length) files.textContent = "No mod archives uploaded yet.";
      if (result.truncated) files.append(document.createTextNode("Showing the first 1,000 archives."));
    } catch (error) { files.textContent = error.message; }
  }
  form.querySelector("[data-mod-refresh]").onclick = listFiles;
  form.querySelector("[data-mod-library]").addEventListener("toggle", event => { if (event.target.open) listFiles(); });
})();
