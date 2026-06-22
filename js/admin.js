// js/admin.js
(() => {
  setupAdminBlogForm();

  loadAdminProjects();
  loadAdminBlogPosts();
  loadAdminWorkshopItems();

  /* ---------------- BLOG CREATE / EDIT FORM ---------------- */

  function setupAdminBlogForm() {
    const form = document.getElementById("adminBlogForm");
    if (!form) return;

    const statusEl = document.getElementById("adminBlogStatus");
    const submitBtn = document.getElementById("adminBlogSubmitBtn");
    const cancelEditBtn = document.getElementById("adminBlogCancelEditBtn");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = form.elements["adminPassword"].value.trim();
      const blogId = form.elements["blog_id"].value.trim();
      const title = form.elements["title"].value.trim();
      const slug = form.elements["slug"].value.trim();
      const excerpt = form.elements["excerpt"].value.trim();
      const content = form.elements["content"].value.trim();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isPublished = form.elements["is_published"].checked;

      if (!password || !title || !slug || !excerpt || !content) {
        setStatus("Please fill in all required fields.");
        return;
      }

      const isEditing = Boolean(blogId);

      setStatus(isEditing ? "Updating blog post..." : "Creating blog post...");
      setSubmitDisabled(true);

      try {
        const endpoint = isEditing
          ? `/api/admin/blog/${encodeURIComponent(blogId)}`
          : "/api/admin/blog";

        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({
            title,
            slug,
            excerpt,
            content,
            cover_image_key: "",
            is_published: isPublished,
            display_order: displayOrder,
          }),
        });

        const data = await readJsonSafe(response);

        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }

        setStatus(
          isEditing
            ? "Blog post updated successfully."
            : "Blog post created successfully."
        );

        resetBlogForm({ keepPassword: true });
        await loadAdminBlogPosts();
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save blog post.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        resetBlogForm({ keepPassword: true });
        setStatus("Edit cancelled.");
      });
    }

    function resetBlogForm({ keepPassword } = { keepPassword: true }) {
      const currentPassword = form.elements["adminPassword"].value;

      form.elements["blog_id"].value = "";
      form.elements["title"].value = "";
      form.elements["slug"].value = "";
      form.elements["excerpt"].value = "";
      form.elements["content"].value = "";
      form.elements["display_order"].value = "0";
      form.elements["is_published"].checked = true;

      if (keepPassword) {
        form.elements["adminPassword"].value = currentPassword;
      } else {
        form.elements["adminPassword"].value = "";
      }

      if (submitBtn) submitBtn.textContent = "Create Blog Post";
      if (cancelEditBtn) cancelEditBtn.hidden = true;
    }

    function setSubmitDisabled(isDisabled) {
      if (submitBtn) submitBtn.disabled = isDisabled;
    }

    function setStatus(message) {
      if (statusEl) statusEl.textContent = message;
    }
  }

  /* ---------------- PROJECTS ---------------- */

  async function loadAdminProjects() {
    const container = document.querySelector("[data-admin-projects]");
    if (!container) return;

    try {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error(`Projects API failed: ${response.status}`);

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.projects)) {
        throw new Error("Invalid projects API response");
      }

      container.innerHTML = data.projects.length
        ? data.projects.map(renderProjectCard).join("")
        : renderEmptyCard("No projects found.");
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load projects.");
    }
  }

  function renderProjectCard(project) {
    return `
      <article class="card">
        <header>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="card__meta">
            ${escapeHtml(project.type)} · ${escapeHtml(project.tech_stack || "No tech stack")}
          </p>
        </header>

        <p>${escapeHtml(project.summary)}</p>

        <ul class="tag-list">
          <li class="tag">Slug: ${escapeHtml(project.slug)}</li>
          <li class="tag">${project.is_featured ? "Featured" : "Not featured"}</li>
          <li class="tag">${project.is_published ? "Published" : "Draft"}</li>
          <li class="tag">Order: ${Number(project.display_order)}</li>
        </ul>

        <div class="card__actions">
          ${project.github_url ? renderLinkButton(project.github_url, "GitHub") : ""}
          ${project.live_url ? renderLinkButton(project.live_url, "Live") : ""}
        </div>
      </article>
    `;
  }

  /* ---------------- BLOG POSTS ---------------- */

  async function loadAdminBlogPosts() {
    const container = document.querySelector("[data-admin-blog]");
    if (!container) return;

    try {
      const response = await fetch("/api/blog");
      if (!response.ok) throw new Error(`Blog API failed: ${response.status}`);

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.blog_posts)) {
        throw new Error("Invalid blog API response");
      }

      if (data.blog_posts.length === 0) {
        container.innerHTML = renderEmptyCard("No blog posts found.");
        return;
      }

      container.innerHTML = data.blog_posts.map(renderBlogPostCard).join("");
      setupBlogEditButtons(container);
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load blog posts.");
    }
  }

  function renderBlogPostCard(post) {
    return `
      <article class="card">
        <header>
          <h3>${escapeHtml(post.title)}</h3>
          <p class="card__meta">Slug: ${escapeHtml(post.slug)}</p>
        </header>

        <p>${escapeHtml(post.excerpt)}</p>

        <ul class="tag-list">
          <li class="tag">${post.is_published ? "Published" : "Draft"}</li>
          <li class="tag">Order: ${Number(post.display_order)}</li>
          <li class="tag">ID: ${Number(post.id)}</li>
        </ul>

        <div class="card__actions">
          <button
            class="btn btn--small btn--primary"
            type="button"
            data-blog-edit
            data-blog-id="${Number(post.id)}"
            data-blog-title="${escapeAttr(post.title)}"
            data-blog-slug="${escapeAttr(post.slug)}"
            data-blog-excerpt="${escapeAttr(post.excerpt)}"
            data-blog-content="${escapeAttr(post.content)}"
            data-blog-order="${Number(post.display_order)}"
            data-blog-published="${post.is_published ? "1" : "0"}"
          >
            Edit
          </button>

          <a
            class="btn btn--small"
            href="blog-post.html?slug=${encodeURIComponent(post.slug)}"
            target="_blank"
            rel="noopener"
          >
            View
          </a>
        </div>
      </article>
    `;
  }

  function setupBlogEditButtons(container) {
    const buttons = container.querySelectorAll("[data-blog-edit]");
    const form = document.getElementById("adminBlogForm");
    const submitBtn = document.getElementById("adminBlogSubmitBtn");
    const cancelEditBtn = document.getElementById("adminBlogCancelEditBtn");
    const statusEl = document.getElementById("adminBlogStatus");

    if (!form) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        form.elements["blog_id"].value = button.dataset.blogId || "";
        form.elements["title"].value = button.dataset.blogTitle || "";
        form.elements["slug"].value = button.dataset.blogSlug || "";
        form.elements["excerpt"].value = button.dataset.blogExcerpt || "";
        form.elements["content"].value = button.dataset.blogContent || "";
        form.elements["display_order"].value = button.dataset.blogOrder || "0";
        form.elements["is_published"].checked =
          button.dataset.blogPublished === "1";

        if (submitBtn) submitBtn.textContent = "Update Blog Post";
        if (cancelEditBtn) cancelEditBtn.hidden = false;
        if (statusEl) statusEl.textContent = "Editing existing blog post.";

        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---------------- WORKSHOP ITEMS ---------------- */

  async function loadAdminWorkshopItems() {
    const container = document.querySelector("[data-admin-workshop]");
    if (!container) return;

    try {
      const response = await fetch("/api/workshop");
      if (!response.ok) throw new Error(`Workshop API failed: ${response.status}`);

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.workshop_items)) {
        throw new Error("Invalid workshop API response");
      }

      container.innerHTML = data.workshop_items.length
        ? data.workshop_items.map(renderWorkshopCard).join("")
        : renderEmptyCard("No workshop items found.");
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load workshop items.");
    }
  }

  function renderWorkshopCard(item) {
    return `
      <article class="card">
        <header>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="card__meta">
            ${escapeHtml(item.game)} · Steam ID ${escapeHtml(item.steam_id)}
          </p>
        </header>

        <p>${escapeHtml(item.description)}</p>

        <ul class="tag-list">
          <li class="tag">${item.is_published ? "Published" : "Draft"}</li>
          <li class="tag">Order: ${Number(item.display_order)}</li>
        </ul>

        <div class="card__actions">
          ${renderPrimaryLinkButton(item.workshop_url, "View on Steam")}
        </div>
      </article>
    `;
  }

  /* ---------------- HELPERS ---------------- */

  async function readJsonSafe(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  function renderLinkButton(url, label) {
    return `
      <a
        class="btn btn--small"
        href="${escapeAttr(url)}"
        target="_blank"
        rel="noopener"
      >
        ${escapeHtml(label)}
      </a>
    `;
  }

  function renderPrimaryLinkButton(url, label) {
    return `
      <a
        class="btn btn--small btn--primary"
        href="${escapeAttr(url)}"
        target="_blank"
        rel="noopener"
      >
        ${escapeHtml(label)}
      </a>
    `;
  }

  function renderEmptyCard(message) {
    return `
      <article class="card">
        <p>${escapeHtml(message)}</p>
      </article>
    `;
  }

  function renderErrorCard(message) {
    return `
      <article class="card">
        <h3>Load error</h3>
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
})();