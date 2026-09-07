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
  let busy = false, controller = null, dragged = null, sequence = 0;
  const dirty = () => form.dispatchEvent(new Event("input", { bubbles: true }));
  const escape = value => String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const sizeText = size => `${(size / 1024 / 1024).toFixed(1)} MB`;
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
  window.hobbyEditor = {
    collect: () => [...gallery.children].map(row => Object.fromEntries([...row.querySelectorAll("[data-field]")].map(field => [field.dataset.field, field.value.trim()]))).filter(image => image.image_url),
    render(value = []) {
      gallery.replaceChildren();
      try { const entries = typeof value === "string" ? JSON.parse(value || "[]") : value; if (Array.isArray(entries)) entries.forEach(image => add(image, false)); } catch { /* Legacy entries have no gallery. */ }
    },
    get busy() { return busy; }
  };
  form.querySelector("[data-hobby-add-image]").onclick = () => add();
  async function upload(file) {
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
      attachment.value = result.url; attachment.dispatchEvent(new Event("input", { bubbles: true }));
      status.textContent = `${file.name} uploaded (${sizeText(file.size)}). Save the project to publish its download link.`;
    } catch (error) { status.textContent = signal.aborted ? "Upload cancelled." : error.message; }
    finally {
      if (token && !completed) { try { await api("abort", { method: "DELETE", headers: { "X-Upload-Token": token } }); } catch { /* R2 expires abandoned multipart uploads. */ } }
      busy = false; controller = null; fileInput.disabled = false; fileInput.value = ""; cancel.hidden = true;
    }
  }
  fileInput.addEventListener("change", () => upload(fileInput.files[0]));
  for (const type of ["dragenter", "dragover"]) area.addEventListener(type, event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); area.classList.add("is-dragging"); } });
  area.addEventListener("dragleave", () => area.classList.remove("is-dragging"));
  area.addEventListener("drop", event => { if (event.dataTransfer.files.length) { event.preventDefault(); area.classList.remove("is-dragging"); upload(event.dataTransfer.files[0]); } });
  cancel.onclick = () => controller?.abort();
  form.querySelector("[data-mod-remove]").onclick = () => { if (!busy) { attachment.value = ""; dirty(); status.textContent = "Attachment removed. Save the project to apply."; } };
  form.addEventListener("submit", event => { if (busy) { event.preventDefault(); event.stopImmediatePropagation(); status.textContent = "Wait for the upload to finish, or cancel it before saving."; } }, true);
  window.addEventListener("hashchange", () => { if (busy) controller?.abort(); });
  window.addEventListener("beforeunload", event => { if (busy) { event.preventDefault(); event.returnValue = ""; } });
  const files = form.querySelector("[data-mod-files]");
  async function listFiles() {
    files.textContent = "Loading archives…";
    try {
      const result = await api("list"); files.replaceChildren();
      for (const file of result.files) {
        const row = document.createElement("div"); row.className = "hobby-file-row";
        const name = document.createElement("span"); name.textContent = `${file.filename} · ${sizeText(file.size)}`;
        const use = document.createElement("button"); use.className = "btn btn--small"; use.type = "button"; use.textContent = "Attach"; use.onclick = () => { if (!busy) { attachment.value = file.url; dirty(); status.textContent = "Archive attached. Save the project to apply."; } };
        const remove = document.createElement("button"); remove.className = "btn btn--small btn--danger"; remove.type = "button"; remove.textContent = "Delete file";
        remove.onclick = async () => {
          if (busy || !confirm(`Permanently delete ${file.filename}?`)) return;
          try { await api(`file&key=${encodeURIComponent(file.key)}`, { method: "DELETE" }); if (attachment.value === file.url) { attachment.value = ""; dirty(); } await listFiles(); }
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
