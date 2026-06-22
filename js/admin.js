// js/admin.js
(() => {
  const ADMIN_PASSWORD_KEY = "portfolioAdminPassword";
setupAdminLogin();
setupAdminBlogForm();
setupAdminProjectForm();

  // If the password was already entered in this browser session,
  // unlock the dashboard automatically.
  if (getStoredAdminPassword()) {
    unlockAdminDashboard();
  }

  /* ---------------- ADMIN LOGIN ---------------- */

  function setupAdminLogin() {
    const form = document.getElementById("adminLoginForm");
    if (!form) return;

    const statusEl = document.getElementById("adminLoginStatus");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = form.elements["password"].value.trim();

      if (!password) {
        setText(statusEl, "Please enter the admin password.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setText(statusEl, "Checking password...");

      try {
        const response = await fetch("/api/admin/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });

        const data = await readJsonSafe(response);

        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }

        sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
        form.reset();
        setText(statusEl, "");

        unlockAdminDashboard();
      } catch (error) {
        console.error(error);
        setText(statusEl, error.message || "Unable to unlock admin.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function unlockAdminDashboard() {
    const loginSection = document.getElementById("adminLoginSection");
    const dashboard = document.getElementById("adminDashboard");

    if (loginSection) loginSection.hidden = true;
    if (dashboard) dashboard.hidden = false;

    loadAdminProjects();
    loadAdminBlogPosts();
    loadAdminWorkshopItems();
  }

  function getStoredAdminPassword() {
    return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "";
  }
  /* ---------------- PROJECT CREATE / EDIT FORM ---------------- */

  function setupAdminProjectForm() {
    const form = document.getElementById("adminProjectForm");
    if (!form) return;

    const statusEl = document.getElementById("adminProjectStatus");
    const submitBtn = document.getElementById("adminProjectSubmitBtn");
    const cancelEditBtn = document.getElementById("adminProjectCancelEditBtn");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = getStoredAdminPassword();
      const projectId = form.elements["project_id"].value.trim();

      const title = form.elements["title"].value.trim();
      const summary = form.elements["summary"].value.trim();
      const body = form.elements["body"].value.trim();
      const type = form.elements["type"].value.trim() || "project";
      const techStack = form.elements["tech_stack"].value.trim();
      const githubUrl = form.elements["github_url"].value.trim();
      const liveUrl = form.elements["live_url"].value.trim();
      const imageKey = form.elements["image_key"].value.trim();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isFeatured = form.elements["is_featured"].checked;
      const isPublished = form.elements["is_published"].checked;

      if (!password) {
        setStatus("Admin session missing. Please unlock the admin page again.");
        return;
      }

      if (!title || !summary) {
        setStatus("Title and summary are required.");
        return;
      }

      const isEditing = Boolean(projectId);

      setStatus(isEditing ? "Updating project..." : "Creating project...");
      setSubmitDisabled(true);

      try {
        const endpoint = isEditing
          ? `/api/admin/projects/${encodeURIComponent(projectId)}`
          : "/api/admin/projects";

        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({
            title,
            summary,
            body,
            type,
            tech_stack: techStack,
            github_url: githubUrl,
            live_url: liveUrl,
            image_key: imageKey,
            is_featured: isFeatured,
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
            ? "Project updated successfully."
            : "Project created successfully."
        );

        resetProjectForm();
        await loadAdminProjects();
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save project.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        resetProjectForm();
        setStatus("Edit cancelled.");
      });
    }

    function resetProjectForm() {
      form.elements["project_id"].value = "";
      form.elements["title"].value = "";
      form.elements["summary"].value = "";
      form.elements["body"].value = "";
      form.elements["type"].value = "project";
      form.elements["tech_stack"].value = "";
      form.elements["github_url"].value = "";
      form.elements["live_url"].value = "";
      form.elements["image_key"].value = "";
      form.elements["display_order"].value = "0";
      form.elements["is_featured"].checked = false;
      form.elements["is_published"].checked = true;

      if (submitBtn) submitBtn.textContent = "Create Project";
      if (cancelEditBtn) cancelEditBtn.hidden = true;
    }

    function setSubmitDisabled(isDisabled) {
      if (submitBtn) submitBtn.disabled = isDisabled;
    }

    function setStatus(message) {
      setText(statusEl, message);
    }
  }
  /* ---------------- BLOG CREATE / EDIT FORM ---------------- */

  function setupAdminBlogForm() {
    const form = document.getElementById("adminBlogForm");
    if (!form) return;

    const statusEl = document.getElementById("adminBlogStatus");
    const submitBtn = document.getElementById("adminBlogSubmitBtn");
    const cancelEditBtn = document.getElementById("adminBlogCancelEditBtn");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = getStoredAdminPassword();
      const blogId = form.elements["blog_id"].value.trim();
      const title = form.elements["title"].value.trim();
      const slug = form.elements["slug"].value.trim();
      const excerpt = form.elements["excerpt"].value.trim();
      const content = form.elements["content"].value.trim();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isPublished = form.elements["is_published"].checked;

      if (!password) {
        setStatus("Admin session missing. Please unlock the admin page again.");
        return;
      }

      if (!title || !slug || !excerpt || !content) {
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

        resetBlogForm();
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
        resetBlogForm();
        setStatus("Edit cancelled.");
      });
    }

    function resetBlogForm() {
      form.elements["blog_id"].value = "";
      form.elements["title"].value = "";
      form.elements["slug"].value = "";
      form.elements["excerpt"].value = "";
      form.elements["content"].value = "";
      form.elements["display_order"].value = "0";
      form.elements["is_published"].checked = true;

      if (submitBtn) submitBtn.textContent = "Create Blog Post";
      if (cancelEditBtn) cancelEditBtn.hidden = true;
    }

    function setSubmitDisabled(isDisabled) {
      if (submitBtn) submitBtn.disabled = isDisabled;
    }

    function setStatus(message) {
      setText(statusEl, message);
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

      if (data.projects.length === 0) {
  container.innerHTML = renderEmptyCard("No projects found.");
  return;
}

container.innerHTML = data.projects.map(renderProjectCard).join("");
setupProjectEditButtons(container);
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
        <li class="tag">ID: ${Number(project.id)}</li>
      </ul>

      <div class="card__actions">
        <button
          class="btn btn--small btn--primary"
          type="button"
          data-project-edit
          data-project-id="${Number(project.id)}"
          data-project-title="${escapeAttr(project.title)}"
          data-project-summary="${escapeAttr(project.summary)}"
          data-project-body="${escapeAttr(project.body || "")}"
          data-project-type="${escapeAttr(project.type || "project")}"
          data-project-tech-stack="${escapeAttr(project.tech_stack || "")}"
          data-project-github-url="${escapeAttr(project.github_url || "")}"
          data-project-live-url="${escapeAttr(project.live_url || "")}"
          data-project-image-key="${escapeAttr(project.image_key || "")}"
          data-project-order="${Number(project.display_order)}"
          data-project-featured="${project.is_featured ? "1" : "0"}"
          data-project-published="${project.is_published ? "1" : "0"}"
        >
          Edit
        </button>

        ${project.github_url ? renderLinkButton(project.github_url, "GitHub") : ""}
        ${project.live_url ? renderLinkButton(project.live_url, "Live") : ""}
      </div>
    </article>
  `;
}
function setupProjectEditButtons(container) {
  const buttons = container.querySelectorAll("[data-project-edit]");
  const form = document.getElementById("adminProjectForm");
  const submitBtn = document.getElementById("adminProjectSubmitBtn");
  const cancelEditBtn = document.getElementById("adminProjectCancelEditBtn");
  const statusEl = document.getElementById("adminProjectStatus");

  if (!form) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      form.elements["project_id"].value = button.dataset.projectId || "";
      form.elements["title"].value = button.dataset.projectTitle || "";
      form.elements["summary"].value = button.dataset.projectSummary || "";
      form.elements["body"].value = button.dataset.projectBody || "";
      form.elements["type"].value = button.dataset.projectType || "project";
      form.elements["tech_stack"].value = button.dataset.projectTechStack || "";
      form.elements["github_url"].value = button.dataset.projectGithubUrl || "";
      form.elements["live_url"].value = button.dataset.projectLiveUrl || "";
      form.elements["image_key"].value = button.dataset.projectImageKey || "";
      form.elements["display_order"].value = button.dataset.projectOrder || "0";
      form.elements["is_featured"].checked =
        button.dataset.projectFeatured === "1";
      form.elements["is_published"].checked =
        button.dataset.projectPublished === "1";

      if (submitBtn) submitBtn.textContent = "Update Project";
      if (cancelEditBtn) cancelEditBtn.hidden = false;
      if (statusEl) statusEl.textContent = "Editing existing project.";

      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
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

  function setText(element, message) {
    if (element) element.textContent = message;
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