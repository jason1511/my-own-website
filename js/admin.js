// js/admin.js
(() => {
  const ADMIN_PASSWORD_KEY = "portfolioAdminPassword";
  const caseStudiesById = new Map();
  setupAdminLogin();
  setupAdminLogout();
  setupAdminCaseStudyForm();
  setupAdminBlogForm();
  setupAdminProjectForm();
  setupAdminWorkshopForm();
  restoreAdminSession();

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
        await verifyAdminPassword(password);

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

  function setupAdminLogout() {
    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
      clearAdminSession();
      lockAdminDashboard("You have been logged out.");
    });
  }

  async function restoreAdminSession() {
    const password = getStoredAdminPassword();
    if (!password) return;

    const statusEl = document.getElementById("adminLoginStatus");
    setText(statusEl, "Checking saved admin session...");

    try {
      await verifyAdminPassword(password);
      setText(statusEl, "");
      unlockAdminDashboard();
    } catch (error) {
      console.error(error);
      clearAdminSession();
      setText(statusEl, "Your saved admin session has expired. Please log in again.");
    }
  }

  async function verifyAdminPassword(password) {
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
  }

  function unlockAdminDashboard() {
    const loginSection = document.getElementById("adminLoginSection");
    const dashboard = document.getElementById("adminDashboard");

    if (loginSection) loginSection.hidden = true;
    if (dashboard) dashboard.hidden = false;

    loadAdminProjects();
    loadAdminCaseStudies();
    loadAdminBlogPosts();
    loadAdminWorkshopItems();
  }

  function lockAdminDashboard(message = "Please log in to continue.") {
    const loginSection = document.getElementById("adminLoginSection");
    const dashboard = document.getElementById("adminDashboard");
    const statusEl = document.getElementById("adminLoginStatus");

    if (loginSection) loginSection.hidden = false;
    if (dashboard) dashboard.hidden = true;
    setText(statusEl, message);
  }

  function clearAdminSession() {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
  }

  function getStoredAdminPassword() {
    return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "";
  }

  async function adminFetch(url, options = {}) {
    const password = getStoredAdminPassword();
    if (!password) {
      lockAdminDashboard("Admin session missing. Please log in again.");
      throw new Error("Admin session missing. Please log in again.");
    }

    const headers = new Headers(options.headers || {});
    headers.set("x-admin-password", password);

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      clearAdminSession();
      lockAdminDashboard("Your admin session has expired. Please log in again.");
      throw new Error("Admin session expired.");
    }

    return response;
  }
    /* ---------------- WORKSHOP CREATE / EDIT FORM ---------------- */

  function setupAdminWorkshopForm() {
    const form = document.getElementById("adminWorkshopForm");
    if (!form) return;

    const statusEl = document.getElementById("adminWorkshopStatus");
    const submitBtn = document.getElementById("adminWorkshopSubmitBtn");
    const cancelEditBtn = document.getElementById("adminWorkshopCancelEditBtn");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = getStoredAdminPassword();
      const workshopId = form.elements["workshop_id"].value.trim();

      const steamId = form.elements["steam_id"].value.trim();
      const title = form.elements["title"].value.trim();
      const game = form.elements["game"].value.trim();
      const description = form.elements["description"].value.trim();
      const workshopUrl = form.elements["workshop_url"].value.trim();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isPublished = form.elements["is_published"].checked;

      if (!password) {
        setStatus("Admin session missing. Please unlock the admin page again.");
        return;
      }

      if (!steamId || !title || !game || !description || !workshopUrl) {
        setStatus("Steam ID, title, game, description, and Workshop URL are required.");
        return;
      }

      const isEditing = Boolean(workshopId);

      setStatus(
        isEditing ? "Updating workshop item..." : "Creating workshop item..."
      );
      setSubmitDisabled(true);

      try {
        const endpoint = isEditing
          ? `/api/admin/workshop/${encodeURIComponent(workshopId)}`
          : "/api/admin/workshop";

        const method = isEditing ? "PUT" : "POST";

        const response = await adminFetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({
            steam_id: steamId,
            title,
            game,
            description,
            workshop_url: workshopUrl,
            display_order: displayOrder,
            is_published: isPublished,
          }),
        });

        const data = await readJsonSafe(response);

        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }

        setStatus(
          isEditing
            ? "Workshop item updated successfully."
            : "Workshop item created successfully."
        );

        resetWorkshopForm();
        await loadAdminWorkshopItems();
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save workshop item.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        resetWorkshopForm();
        setStatus("Edit cancelled.");
      });
    }

    function resetWorkshopForm() {
      form.elements["workshop_id"].value = "";
      form.elements["steam_id"].value = "";
      form.elements["title"].value = "";
      form.elements["game"].value = "";
      form.elements["description"].value = "";
      form.elements["workshop_url"].value = "";
      form.elements["display_order"].value = "0";
      form.elements["is_published"].checked = true;

      if (submitBtn) submitBtn.textContent = "Create Workshop Item";
      if (cancelEditBtn) cancelEditBtn.hidden = true;
    }

    function setSubmitDisabled(isDisabled) {
      if (submitBtn) submitBtn.disabled = isDisabled;
    }

    function setStatus(message) {
      setText(statusEl, message);
    }
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
      const slug = form.elements["slug"].value.trim();
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

        const response = await adminFetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({
            title,
            slug,
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
      form.elements["slug"].value = "";
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
  /* ---------------- CASE STUDY CREATE / EDIT FORM ---------------- */

  function setupAdminCaseStudyForm() {
    const form = document.getElementById("adminCaseStudyForm");
    if (!form) return;

    const statusEl = document.getElementById("adminCaseStudyStatus");
    const submitBtn = document.getElementById("adminCaseStudySubmitBtn");
    const cancelEditBtn = document.getElementById(
      "adminCaseStudyCancelEditBtn"
    );
    const addSectionBtn = form.querySelector(
      "[data-add-case-study-section]"
    );

    renderCaseStudySectionEditors([]);

    addSectionBtn?.addEventListener("click", () => {
      addCaseStudySectionEditor();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const caseStudyId = form.elements["case_study_id"].value.trim();
      const title = form.elements["title"].value.trim();
      const summary = form.elements["summary"].value.trim();
      const problem = form.elements["problem"].value.trim();
      const solution = form.elements["solution"].value.trim();
      const isPublished = form.elements["is_published"].checked;
      const contentSections = collectCaseStudySections();

      if (!title || !summary) {
        setStatus("Title and summary are required.");
        return;
      }

      if (
        isPublished &&
        (!problem || !solution) &&
        contentSections.length === 0
      ) {
        setStatus(
          "Published case studies require a problem and solution or at least one page section."
        );
        return;
      }

      const isEditing = Boolean(caseStudyId);
      setStatus(isEditing ? "Updating case study..." : "Creating case study...");
      setSubmitDisabled(true);

      try {
        const endpoint = isEditing
          ? `/api/admin/case-studies/${encodeURIComponent(caseStudyId)}`
          : "/api/admin/case-studies";

        const response = await adminFetch(endpoint, {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: form.elements["project_id"].value || null,
            title,
            slug: form.elements["slug"].value.trim(),
            summary,
            problem,
            solution,
            key_features: form.elements["key_features"].value.trim(),
            technical_details: form.elements["technical_details"].value.trim(),
            challenges: form.elements["challenges"].value.trim(),
            learnings: form.elements["learnings"].value.trim(),
            tech_stack: form.elements["tech_stack"].value.trim(),
            github_url: form.elements["github_url"].value.trim(),
            live_url: form.elements["live_url"].value.trim(),
            image_key: form.elements["image_key"].value.trim(),
            cover_image_alt: form.elements["cover_image_alt"].value.trim(),
            role: form.elements["role"].value.trim(),
            project_type: form.elements["project_type"].value.trim(),
            intended_users: form.elements["intended_users"].value.trim(),
            platform: form.elements["platform"].value.trim(),
            project_status: form.elements["project_status"].value.trim(),
            timeline: form.elements["timeline"].value.trim(),
            content_sections: contentSections,
            is_featured: form.elements["is_featured"].checked,
            is_published: isPublished,
            display_order: Number(form.elements["display_order"].value || 0),
          }),
        });

        const data = await readJsonSafe(response);

        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }

        resetForm();
        setStatus(
          isEditing
            ? "Case study updated successfully."
            : "Case study created successfully."
        );
        await loadAdminCaseStudies();
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save case study.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    cancelEditBtn?.addEventListener("click", () => {
      resetForm();
      setStatus("Edit cancelled.");
    });

    function resetForm() {
      form.reset();
      form.elements["case_study_id"].value = "";
      form.elements["display_order"].value = "0";
      renderCaseStudySectionEditors([]);

      if (submitBtn) submitBtn.textContent = "Create Case Study";
      if (cancelEditBtn) cancelEditBtn.hidden = true;
    }

    function setSubmitDisabled(isDisabled) {
      if (submitBtn) submitBtn.disabled = isDisabled;
    }

    function setStatus(message) {
      setText(statusEl, message);
    }
  }

  function collectCaseStudySections() {
    const container = document.querySelector("[data-case-study-sections]");
    if (!container) return [];

    return [...container.querySelectorAll("[data-case-study-section-editor]")]
      .map((editor) => {
        const read = (name) =>
          editor.querySelector(`[data-section-field="${name}"]`)?.value.trim() || "";

        return {
          title: read("title"),
          body: read("body"),
          bullets: read("bullets")
            .split(/\r?\n/)
            .map((item) => item.replace(/^[-*•]\s*/, "").trim())
            .filter(Boolean),
          image_url: read("image_url"),
          image_alt: read("image_alt"),
          image_caption: read("image_caption"),
        };
      })
      .filter((section) =>
        Boolean(
          section.title ||
          section.body ||
          section.bullets.length ||
          section.image_url
        )
      );
  }

  function renderCaseStudySectionEditors(sections) {
    const container = document.querySelector("[data-case-study-sections]");
    if (!container) return;

    container.replaceChildren();
    const entries = Array.isArray(sections) && sections.length
      ? sections
      : [{}];

    for (const section of entries) {
      addCaseStudySectionEditor(section);
    }
  }

  function addCaseStudySectionEditor(section = {}) {
    const container = document.querySelector("[data-case-study-sections]");
    if (!container) return;

    const editor = document.createElement("article");
    editor.className = "admin-case-study-section";
    editor.dataset.caseStudySectionEditor = "";
    editor.innerHTML = `
      <div class="admin-case-study-section__header">
        <h4 data-section-number>Section</h4>
        <div class="admin-case-study-section__actions">
          <button class="btn btn--small" type="button" data-section-up>Move Up</button>
          <button class="btn btn--small" type="button" data-section-down>Move Down</button>
          <button class="btn btn--small btn--danger" type="button" data-section-remove>Remove</button>
        </div>
      </div>

      <div class="admin-case-study-section__fields">
        <div>
          <label><strong>Section Heading</strong></label>
          <input data-section-field="title" type="text" value="${escapeAttr(section.title || "")}" placeholder="The Problem, Architecture, Results..." />
        </div>

        <div>
          <label><strong>Body</strong></label>
          <textarea data-section-field="body" rows="7" placeholder="Use a blank line between paragraphs.">${escapeHtml(section.body || "")}</textarea>
        </div>

        <div>
          <label><strong>Bullet Points</strong></label>
          <textarea data-section-field="bullets" rows="5" placeholder="One bullet per line">${escapeHtml(Array.isArray(section.bullets) ? section.bullets.join("\n") : "")}</textarea>
        </div>

        <div>
          <label><strong>Screenshot Path or URL</strong></label>
          <input data-section-field="image_url" type="text" value="${escapeAttr(section.image_url || "")}" placeholder="images/projects/example.jpg or https://..." />
        </div>

        <div>
          <label><strong>Screenshot Alt Text</strong></label>
          <input data-section-field="image_alt" type="text" value="${escapeAttr(section.image_alt || "")}" placeholder="Describe what the screenshot shows" />
        </div>

        <div>
          <label><strong>Screenshot Caption</strong></label>
          <input data-section-field="image_caption" type="text" value="${escapeAttr(section.image_caption || "")}" placeholder="Optional explanation beneath the screenshot" />
        </div>
      </div>
    `;

    editor.querySelector("[data-section-up]")?.addEventListener("click", () => {
      const previous = editor.previousElementSibling;
      if (previous) container.insertBefore(editor, previous);
      updateCaseStudySectionNumbers();
    });

    editor.querySelector("[data-section-down]")?.addEventListener("click", () => {
      const next = editor.nextElementSibling;
      if (next) container.insertBefore(next, editor);
      updateCaseStudySectionNumbers();
    });

    editor.querySelector("[data-section-remove]")?.addEventListener("click", () => {
      editor.remove();
      if (!container.children.length) addCaseStudySectionEditor();
      updateCaseStudySectionNumbers();
    });

    container.append(editor);
    updateCaseStudySectionNumbers();
  }

  function updateCaseStudySectionNumbers() {
    document
      .querySelectorAll("[data-case-study-section-editor]")
      .forEach((editor, index, editors) => {
        const label = editor.querySelector("[data-section-number]");
        const up = editor.querySelector("[data-section-up]");
        const down = editor.querySelector("[data-section-down]");
        if (label) label.textContent = `Section ${index + 1}`;
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === editors.length - 1;
      });
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

        const response = await adminFetch(endpoint, {
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
      const response = await adminFetch("/api/admin/projects");
      if (!response.ok) throw new Error(`Projects API failed: ${response.status}`);

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.projects)) {
        throw new Error("Invalid projects API response");
      }

      populateCaseStudyProjectOptions(data.projects);

      if (data.projects.length === 0) {
  container.innerHTML = renderEmptyCard("No projects found.");
  return;
}

container.innerHTML = data.projects.map(renderProjectCard).join("");
setupProjectEditButtons(container);
setupDeleteButtons(container, {
  selector: "[data-project-delete]",
  endpoint: "/api/admin/projects",
  itemLabel: "project",
  reload: loadAdminProjects,
});
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
          data-project-slug="${escapeAttr(project.slug)}"
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

        <button
          class="btn btn--small btn--danger"
          type="button"
          data-project-delete
          data-delete-id="${Number(project.id)}"
          data-delete-title="${escapeAttr(project.title)}"
        >
          Delete
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
      form.elements["slug"].value = button.dataset.projectSlug || "";
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

  function populateCaseStudyProjectOptions(projects) {
    const select = document.querySelector(
      '#adminCaseStudyForm select[name="project_id"]'
    );
    if (!select) return;

    const selectedValue = select.value;
    select.replaceChildren(new Option("No related project", ""));

    for (const project of projects) {
      select.add(new Option(project.title, String(project.id)));
    }

    if ([...select.options].some((option) => option.value === selectedValue)) {
      select.value = selectedValue;
    }
  }

  /* ---------------- CASE STUDIES ---------------- */

  async function loadAdminCaseStudies() {
    const container = document.querySelector("[data-admin-case-studies]");
    if (!container) return;

    try {
      const response = await adminFetch("/api/admin/case-studies");
      const data = await readJsonSafe(response);

      if (!response.ok || !data.ok || !Array.isArray(data.case_studies)) {
        throw new Error(data.error || "Invalid case studies API response");
      }

      caseStudiesById.clear();
      for (const caseStudy of data.case_studies) {
        caseStudiesById.set(String(caseStudy.id), caseStudy);
      }

      if (data.case_studies.length === 0) {
        container.innerHTML = renderEmptyCard("No case studies found.");
        return;
      }

      container.innerHTML = data.case_studies
        .map(renderCaseStudyAdminCard)
        .join("");

      setupCaseStudyEditButtons(container);
      setupDeleteButtons(container, {
        selector: "[data-case-study-delete]",
        endpoint: "/api/admin/case-studies",
        itemLabel: "case study",
        reload: loadAdminCaseStudies,
      });
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load case studies.");
    }
  }

  function renderCaseStudyAdminCard(caseStudy) {
    return `
      <article class="card">
        <header>
          <h3>${escapeHtml(caseStudy.title)}</h3>
          <p class="card__meta">
            ${escapeHtml(caseStudy.project_title || "Standalone case study")}
          </p>
        </header>

        <p>${escapeHtml(caseStudy.summary)}</p>

        <ul class="tag-list">
          <li class="tag">Slug: ${escapeHtml(caseStudy.slug)}</li>
          <li class="tag">${caseStudy.is_featured ? "Featured" : "Not featured"}</li>
          <li class="tag">${caseStudy.is_published ? "Published" : "Draft"}</li>
          <li class="tag">${Array.isArray(caseStudy.content_sections) ? caseStudy.content_sections.length : 0} sections</li>
          <li class="tag">Order: ${Number(caseStudy.display_order)}</li>
          <li class="tag">ID: ${Number(caseStudy.id)}</li>
        </ul>

        <div class="card__actions">
          <button
            class="btn btn--small btn--primary"
            type="button"
            data-case-study-edit
            data-case-study-id="${Number(caseStudy.id)}"
          >
            Edit
          </button>

          <button
            class="btn btn--small btn--danger"
            type="button"
            data-case-study-delete
            data-delete-id="${Number(caseStudy.id)}"
            data-delete-title="${escapeAttr(caseStudy.title)}"
          >
            Delete
          </button>

          ${
            caseStudy.is_published
              ? `<a
                  class="btn btn--small"
                  href="case-study.html?slug=${encodeURIComponent(caseStudy.slug)}"
                  target="_blank"
                  rel="noopener"
                >
                  View
                </a>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function setupCaseStudyEditButtons(container) {
    const form = document.getElementById("adminCaseStudyForm");
    const submitBtn = document.getElementById("adminCaseStudySubmitBtn");
    const cancelEditBtn = document.getElementById(
      "adminCaseStudyCancelEditBtn"
    );
    const statusEl = document.getElementById("adminCaseStudyStatus");
    if (!form) return;

    container.querySelectorAll("[data-case-study-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const caseStudy = caseStudiesById.get(button.dataset.caseStudyId || "");
        if (!caseStudy) return;

        const values = {
          case_study_id: caseStudy.id,
          project_id: caseStudy.project_id || "",
          title: caseStudy.title,
          slug: caseStudy.slug,
          summary: caseStudy.summary,
          problem: caseStudy.problem,
          solution: caseStudy.solution,
          key_features: caseStudy.key_features,
          technical_details: caseStudy.technical_details,
          challenges: caseStudy.challenges,
          learnings: caseStudy.learnings,
          tech_stack: caseStudy.tech_stack,
          github_url: caseStudy.github_url,
          live_url: caseStudy.live_url,
          image_key: caseStudy.image_key,
          cover_image_alt: caseStudy.cover_image_alt,
          role: caseStudy.role,
          project_type: caseStudy.project_type,
          intended_users: caseStudy.intended_users,
          platform: caseStudy.platform,
          project_status: caseStudy.project_status,
          timeline: caseStudy.timeline,
          display_order: caseStudy.display_order,
        };

        for (const [name, value] of Object.entries(values)) {
          if (form.elements[name]) {
            form.elements[name].value = value ?? "";
          }
        }

        form.elements["is_featured"].checked = Boolean(caseStudy.is_featured);
        form.elements["is_published"].checked = Boolean(caseStudy.is_published);
        renderCaseStudySectionEditors(caseStudy.content_sections);

        if (submitBtn) submitBtn.textContent = "Update Case Study";
        if (cancelEditBtn) cancelEditBtn.hidden = false;
        setText(statusEl, "Editing existing case study.");
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }
  /* ---------------- BLOG POSTS ---------------- */

  async function loadAdminBlogPosts() {
    const container = document.querySelector("[data-admin-blog]");
    if (!container) return;

    try {
      const response = await adminFetch("/api/admin/blog");
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
      setupDeleteButtons(container, {
        selector: "[data-blog-delete]",
        endpoint: "/api/admin/blog",
        itemLabel: "blog post",
        reload: loadAdminBlogPosts,
      });
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

          <button
            class="btn btn--small btn--danger"
            type="button"
            data-blog-delete
            data-delete-id="${Number(post.id)}"
            data-delete-title="${escapeAttr(post.title)}"
          >
            Delete
          </button>

          ${
            post.is_published
              ? `<a
                  class="btn btn--small"
                  href="blog-post.html?slug=${encodeURIComponent(post.slug)}"
                  target="_blank"
                  rel="noopener"
                >
                  View
                </a>`
              : ""
          }
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
      const response = await adminFetch("/api/admin/workshop");
      if (!response.ok) throw new Error(`Workshop API failed: ${response.status}`);

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.workshop_items)) {
        throw new Error("Invalid workshop API response");
      }

      if (data.workshop_items.length === 0) {
  container.innerHTML = renderEmptyCard("No workshop items found.");
  return;
}

container.innerHTML = data.workshop_items.map(renderWorkshopCard).join("");
setupWorkshopEditButtons(container);
setupDeleteButtons(container, {
  selector: "[data-workshop-delete]",
  endpoint: "/api/admin/workshop",
  itemLabel: "workshop item",
  reload: loadAdminWorkshopItems,
});
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
        <li class="tag">ID: ${Number(item.id)}</li>
      </ul>

      <div class="card__actions">
        <button
          class="btn btn--small btn--primary"
          type="button"
          data-workshop-edit
          data-workshop-id="${Number(item.id)}"
          data-workshop-steam-id="${escapeAttr(item.steam_id)}"
          data-workshop-title="${escapeAttr(item.title)}"
          data-workshop-game="${escapeAttr(item.game)}"
          data-workshop-description="${escapeAttr(item.description)}"
          data-workshop-url="${escapeAttr(item.workshop_url)}"
          data-workshop-order="${Number(item.display_order)}"
          data-workshop-published="${item.is_published ? "1" : "0"}"
        >
          Edit
        </button>

        <button
          class="btn btn--small btn--danger"
          type="button"
          data-workshop-delete
          data-delete-id="${Number(item.id)}"
          data-delete-title="${escapeAttr(item.title)}"
        >
          Delete
        </button>

        ${renderPrimaryLinkButton(item.workshop_url, "View on Steam")}
      </div>
    </article>
  `;
}
function setupWorkshopEditButtons(container) {
  const buttons = container.querySelectorAll("[data-workshop-edit]");
  const form = document.getElementById("adminWorkshopForm");
  const submitBtn = document.getElementById("adminWorkshopSubmitBtn");
  const cancelEditBtn = document.getElementById("adminWorkshopCancelEditBtn");
  const statusEl = document.getElementById("adminWorkshopStatus");

  if (!form) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      form.elements["workshop_id"].value = button.dataset.workshopId || "";
      form.elements["steam_id"].value = button.dataset.workshopSteamId || "";
      form.elements["title"].value = button.dataset.workshopTitle || "";
      form.elements["game"].value = button.dataset.workshopGame || "";
      form.elements["description"].value =
        button.dataset.workshopDescription || "";
      form.elements["workshop_url"].value = button.dataset.workshopUrl || "";
      form.elements["display_order"].value =
        button.dataset.workshopOrder || "0";
      form.elements["is_published"].checked =
        button.dataset.workshopPublished === "1";

      if (submitBtn) submitBtn.textContent = "Update Workshop Item";
      if (cancelEditBtn) cancelEditBtn.hidden = false;
      if (statusEl) statusEl.textContent = "Editing existing workshop item.";

      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
  /* ---------------- HELPERS ---------------- */

  function setupDeleteButtons(
    container,
    { selector, endpoint, itemLabel, reload }
  ) {
    const buttons = container.querySelectorAll(selector);

    buttons.forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.deleteId;
        const title = button.dataset.deleteTitle || `this ${itemLabel}`;

        if (!id) return;

        const confirmed = window.confirm(
          `Delete “${title}”? This action cannot be undone.`
        );
        if (!confirmed) return;

        button.disabled = true;

        try {
          const response = await adminFetch(
            `${endpoint}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
          );
          const data = await readJsonSafe(response);

          if (!response.ok || !data.ok) {
            throw new Error(data.error || `Request failed: ${response.status}`);
          }

          await reload();
        } catch (error) {
          console.error(error);
          window.alert(error.message || `Failed to delete ${itemLabel}.`);
          button.disabled = false;
        }
      });
    });
  }

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
