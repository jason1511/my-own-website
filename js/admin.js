// js/admin.js
(() => {
  setupAdminBlogForm();

  loadAdminProjects();
  loadAdminBlogPosts();
  loadAdminWorkshopItems();
  /* ---------------- BLOG CREATE FORM ---------------- */

  function setupAdminBlogForm() {
    const form = document.getElementById("adminBlogForm");
    if (!form) return;

    const statusEl = document.getElementById("adminBlogStatus");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = form.elements["adminPassword"].value.trim();
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

      setStatus("Creating blog post...");

      try {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
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

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${res.status}`);
        }

        setStatus("Blog post created successfully.");

        form.elements["title"].value = "";
        form.elements["slug"].value = "";
        form.elements["excerpt"].value = "";
        form.elements["content"].value = "";
        form.elements["display_order"].value = "0";
        form.elements["is_published"].checked = true;

        loadAdminBlogPosts();
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to create blog post.");
      }
    });

    function setStatus(message) {
      if (statusEl) {
        statusEl.textContent = message;
      }
    }
  }
  /* ---------------- PROJECTS ---------------- */

  async function loadAdminProjects() {
    const container = document.querySelector("[data-admin-projects]");
    if (!container) return;

    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`Projects API failed: ${res.status}`);

      const data = await res.json();

      if (!data.ok || !Array.isArray(data.projects)) {
        throw new Error("Invalid projects API response");
      }

      if (data.projects.length === 0) {
        container.innerHTML = renderEmptyCard("No projects found.");
        return;
      }

      container.innerHTML = data.projects.map(renderProjectCard).join("");
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
          <p class="card__meta">${escapeHtml(project.type)} · ${escapeHtml(project.tech_stack || "No tech stack")}</p>
        </header>

        <p>${escapeHtml(project.summary)}</p>

        <ul class="tag-list">
          <li class="tag">Slug: ${escapeHtml(project.slug)}</li>
          <li class="tag">${project.is_featured ? "Featured" : "Not featured"}</li>
          <li class="tag">${project.is_published ? "Published" : "Draft"}</li>
          <li class="tag">Order: ${Number(project.display_order)}</li>
        </ul>

        <div class="card__actions">
          ${
            project.github_url
              ? `<a class="btn btn--small" href="${escapeAttr(project.github_url)}" target="_blank" rel="noopener">GitHub</a>`
              : ""
          }
          ${
            project.live_url
              ? `<a class="btn btn--small" href="${escapeAttr(project.live_url)}" target="_blank" rel="noopener">Live</a>`
              : ""
          }
        </div>
      </article>
    `;
  }
  /* ---------------- BLOG POSTS ---------------- */

  async function loadAdminBlogPosts() {
    const container = document.querySelector("[data-admin-blog]");
    if (!container) return;

    try {
      const res = await fetch("/api/blog");
      if (!res.ok) throw new Error(`Blog API failed: ${res.status}`);

      const data = await res.json();

      if (!data.ok || !Array.isArray(data.blog_posts)) {
        throw new Error("Invalid blog API response");
      }

      if (data.blog_posts.length === 0) {
        container.innerHTML = renderEmptyCard("No blog posts found.");
        return;
      }

      container.innerHTML = data.blog_posts.map(renderBlogPostCard).join("");
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
        </ul>
      </article>
    `;
  }
  /* ---------------- WORKSHOP ITEMS ---------------- */

  async function loadAdminWorkshopItems() {
    const container = document.querySelector("[data-admin-workshop]");
    if (!container) return;

    try {
      const res = await fetch("/api/workshop");
      if (!res.ok) throw new Error(`Workshop API failed: ${res.status}`);

      const data = await res.json();

      if (!data.ok || !Array.isArray(data.workshop_items)) {
        throw new Error("Invalid workshop API response");
      }

      if (data.workshop_items.length === 0) {
        container.innerHTML = renderEmptyCard("No workshop items found.");
        return;
      }

      container.innerHTML = data.workshop_items.map(renderWorkshopCard).join("");
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
          <p class="card__meta">${escapeHtml(item.game)} · Steam ID ${escapeHtml(item.steam_id)}</p>
        </header>

        <p>${escapeHtml(item.description)}</p>

        <ul class="tag-list">
          <li class="tag">${item.is_published ? "Published" : "Draft"}</li>
          <li class="tag">Order: ${Number(item.display_order)}</li>
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