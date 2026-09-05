// js/admin.js
(() => {
  const caseStudiesById = new Map();
  let adminAppState = null;
  let currentAdminRoute = "";
  let mediaLibraryDialog = null;
  let mediaLibraryTarget = null;
  let mediaAssets = [];
  const dirtyAdminForms = new Set();
  const nextDisplayOrder = new Map();
  const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
  const ALLOWED_MEDIA_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ]);

  setupAdminLogin();
  setupAdminLogout();
  setupAdminCaseStudyForm();
  setupAdminBlogForm();
  setupAdminProjectForm();
  setupAdminWorkshopForm();
  setupAdminMedia();
  setupInlineMediaUploads();
  setupAdminApp();
  restoreAdminSession();

  /* ---------------- ADMIN APP SHELL ---------------- */

  function setupAdminApp() {
    const dashboard = document.getElementById("adminDashboard");
    const hero = dashboard?.querySelector("[data-admin-dashboard-intro]");
    const overview = hero?.nextElementSibling;
    if (!dashboard || !hero || !overview || dashboard.querySelector("[data-admin-app]")) {
      return;
    }

    const sectionDefinitions = [
      {
        key: "projects",
        label: "Projects",
        singular: "Project",
        panel: document.getElementById("admin-projects"),
        formId: "adminProjectForm",
        listSelector: "[data-admin-projects]",
        editSelector: "[data-project-edit]",
        idField: "project_id",
        submitId: "adminProjectSubmitBtn",
        cancelId: "adminProjectCancelEditBtn",
      },
      {
        key: "case-studies",
        label: "Case Studies",
        singular: "Case Study",
        panel: document.getElementById("admin-case-studies"),
        formId: "adminCaseStudyForm",
        listSelector: "[data-admin-case-studies]",
        editSelector: "[data-case-study-edit]",
        idField: "case_study_id",
        submitId: "adminCaseStudySubmitBtn",
        cancelId: "adminCaseStudyCancelEditBtn",
      },
      {
        key: "blog",
        label: "Blog",
        singular: "Blog Post",
        panel: document.getElementById("admin-blog"),
        formId: "adminBlogForm",
        listSelector: "[data-admin-blog]",
        editSelector: "[data-blog-edit]",
        idField: "blog_id",
        submitId: "adminBlogSubmitBtn",
        cancelId: "adminBlogCancelEditBtn",
      },
      {
        key: "workshop",
        label: "Workshop",
        singular: "Workshop Item",
        panel: document.getElementById("admin-workshop"),
        formId: "adminWorkshopForm",
        listSelector: "[data-admin-workshop]",
        editSelector: "[data-workshop-edit]",
        idField: "workshop_id",
        submitId: "adminWorkshopSubmitBtn",
        cancelId: "adminWorkshopCancelEditBtn",
      },
      {
        key: "media",
        label: "Media",
        singular: "Media Asset",
        panel: document.getElementById("admin-media"),
        listSelector: "[data-admin-media]",
      },
    ].filter((section) => section.panel);

    const dashboardPage = document.createElement("section");
    dashboardPage.className = "admin-app__page";
    dashboardPage.dataset.adminPage = "dashboard";
    dashboardPage.append(hero, overview);

    const app = document.createElement("div");
    app.className = "admin-app";
    app.dataset.adminApp = "";

    const sidebar = document.createElement("aside");
    sidebar.className = "admin-app__sidebar";
    sidebar.setAttribute("aria-label", "Admin navigation");

    const sidebarHeader = document.createElement("div");
    sidebarHeader.className = "admin-app__sidebar-header";
    sidebarHeader.innerHTML =
      '<p class="admin-app__eyebrow">Portfolio CMS</p>' +
      '<p class="admin-app__brand">Admin Workspace</p>' +
      '<button class="admin-app__nav-close" type="button" aria-label="Close admin navigation">×</button>';

    const navigation = document.createElement("nav");
    navigation.className = "admin-app__nav";

    const navigationItems = [
      { route: "dashboard", label: "Dashboard" },
      ...sectionDefinitions.map((section) => ({
        route: section.key,
        label: section.label,
      })),
    ];

    for (const item of navigationItems) {
      const link = document.createElement("a");
      link.className = "admin-app__nav-link";
      link.href = "#" + item.route;
      link.dataset.adminRouteLink = item.route;
      link.textContent = item.label;
      navigation.append(link);
    }

    const sidebarFooter = document.createElement("div");
    sidebarFooter.className = "admin-app__sidebar-footer";
    sidebarFooter.innerHTML =
      '<span class="admin-app__session">Secure 8-hour session</span>';

    sidebar.append(sidebarHeader, navigation, sidebarFooter);

    const workspace = document.createElement("div");
    workspace.className = "admin-app__workspace";

    const topbar = document.createElement("header");
    topbar.className = "admin-app__topbar";

    const menuButton = document.createElement("button");
    menuButton.className = "admin-app__menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Open admin navigation");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Sections";

    const titleGroup = document.createElement("div");
    titleGroup.className = "admin-app__title-group";
    titleGroup.innerHTML =
      '<p class="admin-app__eyebrow" data-admin-breadcrumb>Dashboard</p>' +
      '<h1 class="admin-app__title" data-admin-page-title>Dashboard</h1>' +
      '<span class="admin-app__dirty" data-admin-dirty hidden>Unsaved changes</span>';

    const topbarActions = document.createElement("div");
    topbarActions.className = "admin-app__topbar-actions";

    const pageAction = document.createElement("a");
    pageAction.className = "btn btn--small btn--primary";
    pageAction.href = "#dashboard";
    pageAction.dataset.adminPageAction = "";
    pageAction.hidden = true;

    const publicLink = document.createElement("a");
    publicLink.className = "btn btn--small";
    publicLink.href = "index.html";
    publicLink.textContent = "View Site";

    const logoutButton = document.getElementById("adminLogoutBtn");
    if (logoutButton) {
      logoutButton.classList.add("btn--small");
      topbarActions.append(pageAction, publicLink, logoutButton);
    } else {
      topbarActions.append(pageAction, publicLink);
    }

    topbar.append(menuButton, titleGroup, topbarActions);

    const content = document.createElement("div");
    content.className = "admin-app__content";
    content.append(dashboardPage);

    for (const section of sectionDefinitions) {
      section.panel.classList.add("admin-app__page");
      section.panel.dataset.adminPage = section.key;
      content.append(section.panel);

      const container = section.panel.querySelector(":scope > .container");
      section.heading = container?.querySelector(":scope > h2") || null;
      section.lead = container?.querySelector(":scope > .section-lead") || null;
      section.defaultHeading = section.heading?.textContent || section.label;
      section.defaultLead = section.lead?.textContent || "";
      section.form = section.formId
        ? document.getElementById(section.formId)
        : null;
      section.editor =
        container?.querySelector(":scope > .admin-content-editor") ||
        section.form?.closest("article.card") ||
        null;
      section.editorHeading = section.editor?.querySelector(":scope > h3") || null;
      section.list = section.panel.querySelector(section.listSelector);

      if (section.form && section.list) {
        section.listToolbar = createAdminListToolbar(section);
        section.list.before(section.listToolbar);
      }

      if (section.form) {
        setupAdminFormTracking(section);
        setupAdminDraftSave(section);
      }
      if (section.list) observeAdminList(section);
    }

    const navigationScrim = document.createElement("button");
    navigationScrim.className = "admin-app__scrim";
    navigationScrim.type = "button";
    navigationScrim.setAttribute("aria-label", "Close admin navigation");
    navigationScrim.hidden = true;

    workspace.append(topbar, content);
    app.append(sidebar, navigationScrim, workspace);
    dashboard.replaceChildren(app);

    for (const link of dashboardPage.querySelectorAll('a[href^="#admin-"]')) {
      const route = link.getAttribute("href").replace("#admin-", "");
      link.href = "#" + route;
      link.dataset.adminRouteLink = route;
    }

    app.addEventListener("click", (event) => {
      const routeLink = event.target.closest("[data-admin-route-link]");
      if (routeLink) {
        event.preventDefault();
        navigateAdminRoute(routeLink.dataset.adminRouteLink || "dashboard");
        return;
      }

      const actionLink = event.target.closest("[data-admin-page-action]");
      if (actionLink) {
        event.preventDefault();
        navigateAdminRoute(actionLink.dataset.route || "dashboard");
        return;
      }

      const editButton = event.target.closest(
        "[data-project-edit], [data-case-study-edit], [data-blog-edit], [data-workshop-edit]"
      );
      if (editButton) {
        const match = findSectionForEditButton(sectionDefinitions, editButton);
        if (match) {
          const id = readEditButtonId(match, editButton);
          if (id) navigateAdminRoute(match.key + "/edit/" + id, { skipGuard: true });
        }
      }
    });

    const setNavigationOpen = (open) => {
      app.classList.toggle("admin-app--nav-open", open);
      document.body.classList.toggle("admin-nav-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      navigationScrim.hidden = !open;
      if (open) sidebar.querySelector(".admin-app__nav-close")?.focus();
      else menuButton.focus({ preventScroll: true });
    };

    menuButton.addEventListener("click", () => {
      setNavigationOpen(!app.classList.contains("admin-app--nav-open"));
    });
    navigationScrim.addEventListener("click", () => setNavigationOpen(false));
    sidebar.querySelector(".admin-app__nav-close")?.addEventListener("click", () => {
      setNavigationOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && app.classList.contains("admin-app--nav-open")) {
        setNavigationOpen(false);
      }
    });
    window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
      if (event.matches && app.classList.contains("admin-app--nav-open")) {
        setNavigationOpen(false);
      }
    });

    const syncRouteFromLocation = () => {
      const nextRoute = readAdminRoute();
      if (nextRoute === currentAdminRoute) return;
      if (!canLeaveCurrentAdminRoute(nextRoute)) {
        window.history.replaceState(null, "", "#" + currentAdminRoute);
        return;
      }
      applyAdminRoute(nextRoute);
    };

    window.addEventListener("popstate", syncRouteFromLocation);
    window.addEventListener("hashchange", syncRouteFromLocation);

    window.addEventListener("beforeunload", (event) => {
      if (!dirtyAdminForms.size) return;
      event.preventDefault();
      event.returnValue = "";
    });

    adminAppState = {
      app,
      sidebar,
      menuButton,
      dashboardPage,
      sectionDefinitions,
      title: titleGroup.querySelector("[data-admin-page-title]"),
      breadcrumb: titleGroup.querySelector("[data-admin-breadcrumb]"),
      dirty: titleGroup.querySelector("[data-admin-dirty]"),
      pageAction,
      content,
    };

    document.documentElement.style.setProperty("--admin-app-offset", "0px");
    applyAdminRoute(readAdminRoute());
  }

  function createAdminListToolbar(section) {
    const toolbar = document.createElement("div");
    toolbar.className = "admin-list-toolbar";
    toolbar.innerHTML = `
      <p>Use the reorder controls to arrange cards, or open an entry to edit it.</p>
      <a
        class="btn btn--small btn--primary"
        href="#${escapeAttr(section.key)}/new"
        data-admin-route-link="${escapeAttr(section.key)}/new"
      >New ${escapeHtml(section.singular)}</a>
    `;
    return toolbar;
  }

  function setupAdminFormTracking(section) {
    const form = section.form;

    const markDirty = () => {
      dirtyAdminForms.add(form);
      updateAdminDirtyIndicator();
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);

    form.addEventListener("reset", () => {
      dirtyAdminForms.delete(form);
      updateAdminDirtyIndicator();

      if (form.dataset.adminRouterReset === "true") {
        delete form.dataset.adminRouterReset;
        return;
      }

      window.setTimeout(() => {
        navigateAdminRoute(section.key, {
          replace: true,
          skipGuard: true,
        });
      }, 0);
    });
  }

  function setupAdminDraftSave(section) {
    const button = section.form?.querySelector("[data-admin-save-draft]");
    const published = section.form?.elements["is_published"];
    const submit = document.getElementById(section.submitId);
    if (!button || !published || !submit) return;

    button.addEventListener("click", () => {
      published.checked = false;
      published.dispatchEvent(new Event("change", { bubbles: true }));
      section.form.requestSubmit(submit);
    });
  }

  function observeAdminList(section) {
    const observer = new MutationObserver(() => {
      if (currentAdminRoute.startsWith(section.key + "/edit/")) {
        hydrateAdminEditRoute(section, currentAdminRoute);
      }
    });
    observer.observe(section.list, { childList: true });
  }

  function findSectionForEditButton(sections, button) {
    return sections.find((section) =>
      section.editSelector && button.matches(section.editSelector)
    );
  }

  function readEditButtonId(section, button) {
    const names = {
      projects: "projectId",
      "case-studies": "caseStudyId",
      blog: "blogId",
      workshop: "workshopId",
    };
    return button.dataset[names[section.key]] || "";
  }

  function readAdminRoute() {
    const raw = window.location.hash.slice(1).replace(/^admin-/, "");
    if (!raw) return "dashboard";

    const parts = raw.split("/").filter(Boolean);
    const validRoots = new Set([
      "dashboard",
      "projects",
      "case-studies",
      "blog",
      "workshop",
      "media",
    ]);

    if (!validRoots.has(parts[0])) return "dashboard";
    if (parts.length === 1) return parts[0];
    if (parts[1] === "new") return parts[0] + "/new";
    if (parts[1] === "edit" && /^[1-9][0-9]*$/.test(parts[2] || "")) {
      return parts[0] + "/edit/" + parts[2];
    }

    return parts[0];
  }

  function navigateAdminRoute(route, options = {}) {
    const normalized = normalizeAdminRoute(route);
    if (
      !options.skipGuard &&
      normalized !== currentAdminRoute &&
      !canLeaveCurrentAdminRoute(normalized)
    ) {
      return false;
    }

    const method = options.replace ? "replaceState" : "pushState";
    if (window.location.hash !== "#" + normalized) {
      window.history[method](null, "", "#" + normalized);
    }

    applyAdminRoute(normalized);
    return true;
  }

  function normalizeAdminRoute(route) {
    const value = String(route || "dashboard").replace(/^#/, "");
    const parts = value.split("/").filter(Boolean);
    const validRoots = [
      "dashboard",
      "projects",
      "case-studies",
      "blog",
      "workshop",
      "media",
    ];

    if (!validRoots.includes(parts[0])) return "dashboard";
    if (parts[1] === "new") return parts[0] + "/new";
    if (parts[1] === "edit" && /^[1-9][0-9]*$/.test(parts[2] || "")) {
      return parts[0] + "/edit/" + parts[2];
    }
    return parts[0];
  }

  function canLeaveCurrentAdminRoute(nextRoute) {
    const currentSection = getAdminSectionForRoute(currentAdminRoute);
    if (!currentSection?.form || !dirtyAdminForms.has(currentSection.form)) {
      return true;
    }

    return window.confirm(
      "You have unsaved changes. Leave this editor and discard them?"
    );
  }

  function applyAdminRoute(route) {
    if (!adminAppState) return;

    const normalized = normalizeAdminRoute(route);
    const parts = normalized.split("/");
    const root = parts[0];
    const mode = parts[1] || "list";
    const itemId = parts[2] || "";
    const activePage =
      root === "dashboard"
        ? adminAppState.dashboardPage
        : adminAppState.sectionDefinitions.find((section) => section.key === root)?.panel;

    for (const page of adminAppState.content.querySelectorAll("[data-admin-page]")) {
      page.hidden = page !== activePage;
    }

    for (const link of adminAppState.sidebar.querySelectorAll("[data-admin-route-link]")) {
      const active = link.dataset.adminRouteLink === root;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }

    const section = getAdminSectionForRoute(normalized);
    if (section) {
      applyAdminContentMode(section, mode, itemId, normalized);
    } else {
      setAdminPageChrome("Dashboard", "Overview", "", "");
    }

    const navigationWasOpen = adminAppState.app.classList.contains("admin-app--nav-open");
    currentAdminRoute = normalized;
    adminAppState.app.classList.remove("admin-app--nav-open");
    document.body.classList.remove("admin-nav-open");
    const scrim = adminAppState.app.querySelector(".admin-app__scrim");
    if (scrim) scrim.hidden = true;
    adminAppState.menuButton.setAttribute("aria-expanded", "false");
    if (navigationWasOpen && window.matchMedia("(max-width: 900px)").matches) {
      adminAppState.menuButton.focus({ preventScroll: true });
    }
    updateAdminDirtyIndicator();

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function applyAdminContentMode(section, mode, itemId, route) {
    const hasEditor = Boolean(section.form && section.editor);
    const editorMode = hasEditor && (mode === "new" || mode === "edit");

    if (section.editor) section.editor.hidden = !editorMode;
    if (section.list) section.list.hidden = editorMode;
    if (section.listToolbar) section.listToolbar.hidden = editorMode;

    if (mode === "new" && hasEditor && currentAdminRoute !== route) {
      prepareNewAdminEditor(section);
    }

    if (mode === "edit" && hasEditor) {
      hydrateAdminEditRoute(section, route);
    }

    if (section.heading) {
      section.heading.textContent = editorMode
        ? (mode === "edit" ? "Edit " : "New ") + section.singular
        : section.defaultHeading;
    }

    if (section.lead) {
      section.lead.textContent = editorMode
        ? "Complete the fields below, then save your changes."
        : section.defaultLead;
    }

    if (section.editorHeading && editorMode) {
      section.editorHeading.textContent =
        (mode === "edit" ? "Edit " : "Create ") + section.singular;
    }

    if (!hasEditor) {
      setAdminPageChrome(section.label, section.label, "", "");
      return;
    }

    if (editorMode) {
      setAdminPageChrome(
        mode === "edit" ? "Edit " + section.singular : "New " + section.singular,
        section.label,
        section.key,
        "Back to " + section.label
      );
    } else {
      setAdminPageChrome(
        section.label,
        section.label,
        section.key + "/new",
        "New " + section.singular
      );
    }
  }

  function prepareNewAdminEditor(section) {
    const form = section.form;
    form.dataset.adminRouterReset = "true";
    form.reset();

    if (form.elements[section.idField]) {
      form.elements[section.idField].value = "";
    }
    if (form.elements["display_order"]) {
      form.elements["display_order"].value = String(
        nextDisplayOrder.get(section.key) || 0
      );
    }

    const submit = document.getElementById(section.submitId);
    const cancel = document.getElementById(section.cancelId);
    if (submit) submit.textContent = "Create " + section.singular;
    if (cancel) cancel.hidden = false;

    if (section.key === "case-studies") {
      renderCaseStudySectionEditors([]);
    }

    if (section.key === "projects") {
      renderProjectGalleryEditors([]);
    }

    dirtyAdminForms.delete(form);
  }

  function hydrateAdminEditRoute(section, route) {
    const itemId = route.split("/")[2] || "";
    if (!itemId || !section.form || !section.editSelector) return;

    const currentId = section.form.elements[section.idField]?.value || "";
    if (String(currentId) === String(itemId)) return;

    const button = [...section.list.querySelectorAll(section.editSelector)].find(
      (candidate) => String(readEditButtonId(section, candidate)) === String(itemId)
    );
    button?.click();
  }

  function getAdminSectionForRoute(route) {
    const root = String(route || "").split("/")[0];
    return adminAppState?.sectionDefinitions.find((section) => section.key === root) || null;
  }

  function setAdminPageChrome(title, breadcrumb, actionRoute, actionLabel) {
    if (!adminAppState) return;

    adminAppState.title.textContent = title;
    adminAppState.breadcrumb.textContent = breadcrumb;

    if (actionRoute && actionLabel) {
      adminAppState.pageAction.hidden = false;
      adminAppState.pageAction.dataset.route = actionRoute;
      adminAppState.pageAction.href = "#" + actionRoute;
      adminAppState.pageAction.textContent = actionLabel;
    } else {
      adminAppState.pageAction.hidden = true;
      adminAppState.pageAction.dataset.route = "";
    }
  }

  function updateAdminDirtyIndicator() {
    if (!adminAppState?.dirty) return;
    const section = getAdminSectionForRoute(currentAdminRoute);
    adminAppState.dirty.hidden = !section?.form || !dirtyAdminForms.has(section.form);
  }

  function completeAdminEditorSave(form, route, message) {
    dirtyAdminForms.delete(form);
    updateAdminDirtyIndicator();
    navigateAdminRoute(route, { replace: true, skipGuard: true });
    showAdminToast(message);
  }

  function cancelAdminEditor(form, route, reset) {
    if (!navigateAdminRoute(route)) return;
    dirtyAdminForms.delete(form);
    reset();
    updateAdminDirtyIndicator();
  }

  function showAdminToast(message) {
    document.querySelector("[data-admin-toast]")?.remove();
    const toast = document.createElement("div");
    toast.className = "admin-toast";
    toast.dataset.adminToast = "";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
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
        await verifyAdminPassword(password);

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

    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;

      try {
        await logoutAdminSession();
        lockAdminDashboard("You have been logged out.");
      } catch (error) {
        console.error(error);
        window.alert("Could not log out. Please check your connection and try again.");
      } finally {
        logoutBtn.disabled = false;
      }
    });
  }

  async function restoreAdminSession() {
    const statusEl = document.getElementById("adminLoginStatus");
    setText(statusEl, "Checking saved admin session...");

    try {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        setText(statusEl, "");
        return;
      }

      const data = await readJsonSafe(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to verify admin session.");
      }

      setText(statusEl, "");
      unlockAdminDashboard();
    } catch (error) {
      console.error(error);
      setText(statusEl, "Unable to check the saved admin session.");
    }
  }

  async function verifyAdminPassword(password) {
    const response = await fetch("/api/admin/session", {
      method: "POST",
      credentials: "same-origin",
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

    applyAdminRoute(readAdminRoute());

    loadAdminProjects();
    loadAdminCaseStudies();
    loadAdminBlogPosts();
    loadAdminWorkshopItems();
    loadAdminMedia();
  }

  function lockAdminDashboard(message = "Please log in to continue.") {
    const loginSection = document.getElementById("adminLoginSection");
    const dashboard = document.getElementById("adminDashboard");
    const statusEl = document.getElementById("adminLoginStatus");

    if (loginSection) loginSection.hidden = false;
    if (dashboard) dashboard.hidden = true;
    setText(statusEl, message);
  }

  async function logoutAdminSession() {
    const response = await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const data = await readJsonSafe(response);

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to end admin session.");
    }
  }

  async function adminFetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
    });

    if (response.status === 401) {
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
      const workshopId = form.elements["workshop_id"].value.trim();

      const steamId = form.elements["steam_id"].value.trim();
      const title = form.elements["title"].value.trim();
      const game = form.elements["game"].value.trim();
      const description = form.elements["description"].value.trim();
      const workshopUrl = form.elements["workshop_url"].value.trim();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isPublished = form.elements["is_published"].checked;

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

        const successMessage =
          isEditing
            ? "Workshop item updated successfully."
            : "Workshop item created successfully.";

        resetWorkshopForm();
        await loadAdminWorkshopItems();
        completeAdminEditorSave(form, "workshop", successMessage);
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save workshop item.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        cancelAdminEditor(form, "workshop", resetWorkshopForm);
      });
    }

    function resetWorkshopForm() {
      form.elements["workshop_id"].value = "";
      form.elements["steam_id"].value = "";
      form.elements["title"].value = "";
      form.elements["game"].value = "";
      form.elements["description"].value = "";
      form.elements["workshop_url"].value = "";
      form.elements["display_order"].value = String(nextDisplayOrder.get("workshop") || 0);
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
    const addGalleryImageBtn = form.querySelector("[data-add-project-image]");

    renderProjectGalleryEditors([]);
    addGalleryImageBtn?.addEventListener("click", () => addProjectGalleryEditor());

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
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
      const screenshots = collectProjectScreenshots();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isFeatured = form.elements["is_featured"].checked;
      const isPublished = form.elements["is_published"].checked;

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
            screenshots,
            is_featured: isFeatured,
            is_published: isPublished,
            display_order: displayOrder,
          }),
        });

        const data = await readJsonSafe(response);

        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }

        const successMessage =
          isEditing
            ? "Project updated successfully."
            : "Project created successfully.";

        resetProjectForm();
        await loadAdminProjects();
        completeAdminEditorSave(form, "projects", successMessage);
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save project.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        cancelAdminEditor(form, "projects", resetProjectForm);
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
      renderProjectGalleryEditors([]);
      form.elements["display_order"].value = String(nextDisplayOrder.get("projects") || 0);
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

  function collectProjectScreenshots() {
    const container = document.querySelector("[data-project-gallery]");
    if (!container) return [];

    return [...container.querySelectorAll("[data-project-gallery-item]")]
      .map((editor) => {
        const read = (name) =>
          editor.querySelector(`[data-project-image-field="${name}"]`)
            ?.value.trim() || "";

        return {
          image_url: read("image_url"),
          image_alt: read("image_alt"),
          image_caption: read("image_caption"),
        };
      })
      .filter((image) => image.image_url);
  }

  function renderProjectGalleryEditors(screenshots) {
    const container = document.querySelector("[data-project-gallery]");
    if (!container) return;

    container.replaceChildren();
    const entries = Array.isArray(screenshots) ? screenshots : [];
    for (const screenshot of entries) addProjectGalleryEditor(screenshot);
  }

  function addProjectGalleryEditor(screenshot = {}) {
    const container = document.querySelector("[data-project-gallery]");
    if (!container) return;

    const editor = document.createElement("article");
    editor.className = "admin-project-gallery-item";
    editor.dataset.projectGalleryItem = "";
    editor.innerHTML = `
      <div class="admin-project-gallery-item__header">
        <h4 data-project-image-number>Gallery Image</h4>
        <div class="admin-project-gallery-item__actions">
          <button class="btn btn--small" type="button" data-project-image-up>Move Up</button>
          <button class="btn btn--small" type="button" data-project-image-down>Move Down</button>
          <button class="btn btn--small btn--danger" type="button" data-project-image-remove>Remove</button>
        </div>
      </div>
      <div class="admin-project-gallery-item__fields">
        <div>
          <label><strong>Image Path or URL</strong></label>
          <input data-project-image-field="image_url" type="text" value="${escapeAttr(screenshot.image_url || screenshot.url || "")}" placeholder="/media/example.webp or https://..." />
          <div class="admin-media-picker" data-media-picker tabindex="0">
            <input data-media-file type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
            <button class="btn btn--small" type="button" data-media-upload>Upload Screenshot</button>
            <small>or focus here and press Ctrl+V to paste an image</small>
            <span data-media-upload-status></span>
          </div>
        </div>
        <div>
          <label><strong>Alt Text</strong></label>
          <input data-project-image-field="image_alt" type="text" value="${escapeAttr(screenshot.image_alt || screenshot.alt || "")}" placeholder="Describe what the screenshot shows" />
        </div>
        <div>
          <label><strong>Caption</strong></label>
          <input data-project-image-field="image_caption" type="text" value="${escapeAttr(screenshot.image_caption || screenshot.caption || "")}" placeholder="Optional explanation beneath the screenshot" />
        </div>
      </div>
    `;

    editor.querySelector("[data-project-image-up]")?.addEventListener("click", () => {
      const previous = editor.previousElementSibling;
      if (previous) container.insertBefore(editor, previous);
      updateProjectGalleryNumbers();
    });
    editor.querySelector("[data-project-image-down]")?.addEventListener("click", () => {
      const next = editor.nextElementSibling;
      if (next) container.insertBefore(next, editor);
      updateProjectGalleryNumbers();
    });
    editor.querySelector("[data-project-image-remove]")?.addEventListener("click", () => {
      editor.remove();
      updateProjectGalleryNumbers();
    });

    container.append(editor);
    enhanceMediaPicker(editor.querySelector("[data-media-picker]"));
    updateProjectGalleryNumbers();
  }

  function updateProjectGalleryNumbers() {
    const editors = [...document.querySelectorAll("[data-project-gallery-item]")];
    editors.forEach((editor, index) => {
      const label = editor.querySelector("[data-project-image-number]");
      const up = editor.querySelector("[data-project-image-up]");
      const down = editor.querySelector("[data-project-image-down]");
      if (label) label.textContent = `Gallery Image ${index + 1}`;
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === editors.length - 1;
    });
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

        const successMessage =
          isEditing
            ? "Case study updated successfully."
            : "Case study created successfully.";
        resetForm();
        await loadAdminCaseStudies();
        completeAdminEditorSave(form, "case-studies", successMessage);
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save case study.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    cancelEditBtn?.addEventListener("click", () => {
      cancelAdminEditor(form, "case-studies", resetForm);
    });

    function resetForm() {
      form.reset();
      form.elements["case_study_id"].value = "";
      form.elements["display_order"].value = String(nextDisplayOrder.get("case-studies") || 0);
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
          <input data-section-field="image_url" type="text" value="${escapeAttr(section.image_url || "")}" placeholder="/media/example.webp or https://..." />
          <div class="admin-media-picker" data-media-picker tabindex="0">
            <input data-media-file type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
            <button class="btn btn--small" type="button" data-media-upload>Upload Screenshot</button>
            <small>or focus here and press Ctrl+V to paste an image</small>
            <span data-media-upload-status></span>
          </div>
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
    enhanceMediaPicker(editor.querySelector("[data-media-picker]"));
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
      const blogId = form.elements["blog_id"].value.trim();
      const title = form.elements["title"].value.trim();
      const slug = form.elements["slug"].value.trim();
      const excerpt = form.elements["excerpt"].value.trim();
      const content = form.elements["content"].value.trim();
      const coverImageKey = form.elements["cover_image_key"].value.trim();
      const displayOrder = Number(form.elements["display_order"].value || 0);
      const isPublished = form.elements["is_published"].checked;

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
          },
          body: JSON.stringify({
            title,
            slug,
            excerpt,
            content,
            cover_image_key: coverImageKey,
            is_published: isPublished,
            display_order: displayOrder,
          }),
        });

        const data = await readJsonSafe(response);

        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Request failed: ${response.status}`);
        }

        const successMessage =
          isEditing
            ? "Blog post updated successfully."
            : "Blog post created successfully.";

        resetBlogForm();
        await loadAdminBlogPosts();
        completeAdminEditorSave(form, "blog", successMessage);
      } catch (error) {
        console.error(error);
        setStatus(error.message || "Failed to save blog post.");
      } finally {
        setSubmitDisabled(false);
      }
    });

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        cancelAdminEditor(form, "blog", resetBlogForm);
      });
    }

    function resetBlogForm() {
      form.elements["blog_id"].value = "";
      form.elements["title"].value = "";
      form.elements["slug"].value = "";
      form.elements["excerpt"].value = "";
      form.elements["content"].value = "";
      form.elements["cover_image_key"].value = "";
      form.elements["display_order"].value = String(nextDisplayOrder.get("blog") || 0);
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
      setNextDisplayOrder("projects", data.projects, "adminProjectForm");

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
setupReorderableList(container, {
  collection: "projects",
  reload: loadAdminProjects,
});
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load projects.");
    }
  }

function renderProjectCard(project) {
  return `
    <article class="card" data-reorder-id="${Number(project.id)}">
      ${renderOrderControls(project.title)}
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
        <li class="tag">${Array.isArray(project.screenshots) ? project.screenshots.length : 0} gallery images</li>
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
          data-project-screenshots="${escapeAttr(JSON.stringify(project.screenshots || []))}"
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
      renderProjectGalleryEditors(parseJsonArray(button.dataset.projectScreenshots));
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
      setNextDisplayOrder("case-studies", data.case_studies, "adminCaseStudyForm");

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
      setupReorderableList(container, {
        collection: "case-studies",
        reload: loadAdminCaseStudies,
      });
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load case studies.");
    }
  }

  function renderCaseStudyAdminCard(caseStudy) {
    return `
      <article class="card" data-reorder-id="${Number(caseStudy.id)}">
        ${renderOrderControls(caseStudy.title)}
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
      setNextDisplayOrder("blog", data.blog_posts, "adminBlogForm");

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
      setupReorderableList(container, {
        collection: "blog",
        reload: loadAdminBlogPosts,
      });
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load blog posts.");
    }
  }

  function renderBlogPostCard(post) {
    return `
      <article class="card" data-reorder-id="${Number(post.id)}">
        ${renderOrderControls(post.title)}
        <header>
          <h3>${escapeHtml(post.title)}</h3>
          <p class="card__meta">Slug: ${escapeHtml(post.slug)}</p>
        </header>

        <p>${escapeHtml(post.excerpt)}</p>

        <ul class="tag-list">
          <li class="tag">${post.is_published ? "Published" : "Draft"}</li>
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
            data-blog-cover-image-key="${escapeAttr(post.cover_image_key || "")}"
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
        form.elements["cover_image_key"].value =
          button.dataset.blogCoverImageKey || "";
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
      setNextDisplayOrder("workshop", data.workshop_items, "adminWorkshopForm");

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
setupReorderableList(container, {
  collection: "workshop",
  reload: loadAdminWorkshopItems,
});
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard("Could not load workshop items.");
    }
  }

function renderWorkshopCard(item) {
  return `
    <article class="card" data-reorder-id="${Number(item.id)}">
      ${renderOrderControls(item.title)}
      <header>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="card__meta">
          ${escapeHtml(item.game)} · Steam ID ${escapeHtml(item.steam_id)}
        </p>
      </header>

      <p>${escapeHtml(item.description)}</p>

      <ul class="tag-list">
        <li class="tag">${item.is_published ? "Published" : "Draft"}</li>
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

  /* ---------------- R2 MEDIA ---------------- */

  function setupAdminMedia() {
    const form = document.getElementById("adminMediaForm");
    if (!form) return;

    const statusEl = document.getElementById("adminMediaStatus");
    const submitBtn = form.querySelector('button[type="submit"]');
    const searchInput = document.querySelector("[data-media-search]");
    const typeSelect = document.querySelector("[data-media-type]");
    const sortSelect = document.querySelector("[data-media-sort]");

    searchInput?.addEventListener("input", renderAdminMedia);
    typeSelect?.addEventListener("change", renderAdminMedia);
    sortSelect?.addEventListener("change", renderAdminMedia);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const file = form.elements["file"].files?.[0];
      const altText = form.elements["alt_text"].value.trim();
      const displayName = form.elements["display_name"].value.trim();

      if (!file) {
        setText(statusEl, "Choose an image first.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setText(statusEl, "Uploading image...");

      try {
        const asset = await uploadMediaFile(file, altText, displayName);
        form.reset();
        setText(statusEl, `Uploaded ${asset.filename}. Path: ${asset.url}`);
        await loadAdminMedia();
      } catch (error) {
        console.error(error);
        setText(statusEl, error.message || "Failed to upload image.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function setupInlineMediaUploads() {
    document.querySelectorAll("[data-media-picker]").forEach(enhanceMediaPicker);

    document.addEventListener("click", async (event) => {
      const chooseButton = event.target.closest("[data-media-choose]");
      if (chooseButton) {
        const target = resolveMediaPickerTarget(
          chooseButton.closest("[data-media-picker]")
        );
        if (target) openMediaLibrary(target);
        return;
      }

      const button = event.target.closest("[data-media-upload]");
      if (!button) return;

      const picker = button.closest("[data-media-picker]");
      const fileInput = picker?.querySelector("[data-media-file]");
      const statusEl = picker?.querySelector("[data-media-upload-status]");
      const file = fileInput?.files?.[0];

      if (!file) {
        setText(statusEl, "Choose an image first.");
        return;
      }

      const target = resolveMediaPickerTarget(picker);

      if (!target) {
        setText(statusEl, "Could not find the image field.");
        return;
      }

      button.disabled = true;
      setText(statusEl, "Uploading...");

      try {
        const asset = await uploadMediaFile(file, "");
        target.value = asset.url;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        fileInput.value = "";
        setText(statusEl, "Uploaded and inserted.");
        await loadAdminMedia();
      } catch (error) {
        console.error(error);
        setText(statusEl, error.message || "Upload failed.");
      } finally {
        button.disabled = false;
      }
    });

    document.addEventListener("paste", (event) => {
      const zone = event.target.closest(
        "[data-media-picker], [data-media-paste-zone]"
      );
      if (!zone) return;

      const clipboardItems = [...(event.clipboardData?.items || [])];
      const imageItem = clipboardItems.find((item) =>
        item.type.startsWith("image/")
      );
      const file = imageItem?.getAsFile();
      const statusEl = zone.matches("[data-media-picker]")
        ? zone.querySelector("[data-media-upload-status]")
        : document.getElementById("adminMediaStatus");

      if (!file) {
        setText(statusEl, "The clipboard does not contain an image.");
        return;
      }

      event.preventDefault();

      try {
        validateMediaFile(file);
        const fileInput = zone.matches("[data-media-picker]")
          ? zone.querySelector("[data-media-file]")
          : document.getElementById("adminMediaFile");

        if (!fileInput || typeof DataTransfer === "undefined") {
          throw new Error("This browser cannot attach the pasted image.");
        }

        const pastedFile = createPastedImageFile(file);
        const transfer = new DataTransfer();
        transfer.items.add(pastedFile);
        fileInput.files = transfer.files;

        if (zone.matches("[data-media-picker]")) {
          setText(statusEl, "Pasted image detected. Uploading...");
          zone.querySelector("[data-media-upload]")?.click();
        } else {
          const nameInput = document.getElementById("adminMediaName");
          if (nameInput && !nameInput.value.trim()) {
            nameInput.value = pastedFile.name.replace(/\.[^.]+$/, "");
          }
          setText(
            statusEl,
            `Pasted ${pastedFile.name}. Rename it if needed, add alt text, then select Upload Image.`
          );
        }
      } catch (error) {
        setText(statusEl, error.message || "Could not use the pasted image.");
      }
    });
  }

  function enhanceMediaPicker(picker) {
    if (!picker || picker.querySelector("[data-media-choose]")) return;

    const button = document.createElement("button");
    button.className = "btn btn--small";
    button.type = "button";
    button.dataset.mediaChoose = "";
    button.textContent = "Choose from Media";

    const hint = picker.querySelector("small");
    picker.insertBefore(button, hint || picker.lastElementChild);
  }

  function resolveMediaPickerTarget(picker) {
    if (!picker) return null;

    const uploadButton = picker.querySelector("[data-media-upload]");
    if (uploadButton?.dataset.mediaTarget) {
      return document.getElementById(uploadButton.dataset.mediaTarget);
    }

    return (
      picker.closest("[data-case-study-section-editor]")
        ?.querySelector('[data-section-field="image_url"]') ||
      picker.closest("[data-project-gallery-item]")
        ?.querySelector('[data-project-image-field="image_url"]') ||
      null
    );
  }

  async function openMediaLibrary(target) {
    mediaLibraryTarget = target;
    const dialog = getMediaLibraryDialog();
    const list = dialog.querySelector("[data-media-library-list]");
    list.innerHTML = '<p class="admin-form-status">Loading images…</p>';

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");

    try {
      const response = await adminFetch("/api/admin/media", {
        headers: { Accept: "application/json" },
      });
      const data = await readJsonSafe(response);
      if (!response.ok || !data.ok || !Array.isArray(data.assets)) {
        throw new Error(data.error || "Could not load Media.");
      }

      list.innerHTML = data.assets.length
        ? data.assets.map(renderMediaChoice).join("")
        : renderEmptyCard("No images have been uploaded yet.");
    } catch (error) {
      list.innerHTML = renderErrorCard(error.message || "Could not load Media.");
    }
  }

  function getMediaLibraryDialog() {
    if (mediaLibraryDialog) return mediaLibraryDialog;

    const dialog = document.createElement("dialog");
    dialog.className = "admin-media-dialog";
    dialog.innerHTML = `
      <div class="admin-media-dialog__header">
        <div>
          <p class="admin-app__eyebrow">R2 Media Library</p>
          <h2>Choose an Image</h2>
        </div>
        <button class="btn btn--small" type="button" data-media-dialog-close>Close</button>
      </div>
      <div class="admin-media-dialog__grid" data-media-library-list></div>
    `;

    dialog.querySelector("[data-media-dialog-close]")?.addEventListener(
      "click",
      () => closeMediaLibrary(dialog)
    );
    dialog.addEventListener("close", () => {
      mediaLibraryTarget = null;
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeMediaLibrary(dialog);

      const choice = event.target.closest("[data-media-select]");
      if (!choice || !mediaLibraryTarget) return;

      applyMediaChoice(
        mediaLibraryTarget,
        choice.dataset.mediaUrl || "",
        choice.dataset.mediaAlt || ""
      );
      closeMediaLibrary(dialog);
    });

    document.body.append(dialog);
    mediaLibraryDialog = dialog;
    return dialog;
  }

  function renderMediaChoice(asset) {
    return `
      <button
        class="admin-media-choice"
        type="button"
        data-media-select
        data-media-url="${escapeAttr(asset.url)}"
        data-media-alt="${escapeAttr(asset.alt_text || "")}"
      >
        <img src="${escapeAttr(asset.url)}" alt="" loading="lazy" />
        <span>${escapeHtml(asset.filename)}</span>
      </button>
    `;
  }

  function applyMediaChoice(target, url, altText) {
    target.value = url;
    target.dispatchEvent(new Event("input", { bubbles: true }));

    const altTarget =
      target.closest("[data-project-gallery-item]")
        ?.querySelector('[data-project-image-field="image_alt"]') ||
      target.closest("[data-case-study-section-editor]")
        ?.querySelector('[data-section-field="image_alt"]') ||
      (target.id === "caseStudyImageKey"
        ? document.getElementById("caseStudyCoverAlt")
        : null);

    if (altTarget && !altTarget.value.trim() && altText) {
      altTarget.value = altText;
      altTarget.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function closeMediaLibrary(dialog) {
    mediaLibraryTarget = null;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  async function uploadMediaFile(file, altText, filename = "") {
    validateMediaFile(file);

    const body = new FormData();
    body.append("file", file);
    body.append("alt_text", altText || "");
    if (filename) body.append("filename", filename);

    const response = await adminFetch("/api/admin/media", {
      method: "POST",
      body,
    });
    const data = await readJsonSafe(response);

    if (!response.ok || !data.ok || !data.asset) {
      throw new Error(data.error || `Upload failed: ${response.status}`);
    }

    return data.asset;
  }

  function validateMediaFile(file) {
    if (!file || !ALLOWED_MEDIA_TYPES.has(file.type)) {
      throw new Error("Use a JPG, PNG, WebP, GIF, or AVIF image.");
    }

    if (!file.size || file.size > MAX_MEDIA_SIZE) {
      throw new Error("Images must be 5 MB or smaller.");
    }
  }

  function createPastedImageFile(file) {
    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    };
    const extension = extensions[file.type] || "png";
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "-")
      .slice(0, 15);

    return new File([file], `pasted-screenshot-${timestamp}.${extension}`, {
      type: file.type,
      lastModified: Date.now(),
    });
  }

  async function loadAdminMedia() {
    const container = document.querySelector("[data-admin-media]");
    if (!container) return;

    try {
      const response = await adminFetch("/api/admin/media", {
        headers: { Accept: "application/json" },
      });
      const data = await readJsonSafe(response);

      if (!response.ok || !data.ok || !Array.isArray(data.assets)) {
        throw new Error(data.error || "Invalid media API response.");
      }

      mediaAssets = data.assets;
      renderAdminMedia();
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorCard(
        error.message || "Could not load media assets."
      );
    }
  }

  function renderAdminMedia() {
    const container = document.querySelector("[data-admin-media]");
    const count = document.querySelector("[data-media-count]");
    if (!container) return;

    const query = String(document.querySelector("[data-media-search]")?.value || "")
      .trim()
      .toLowerCase();
    const type = document.querySelector("[data-media-type]")?.value || "all";
    const sort = document.querySelector("[data-media-sort]")?.value || "newest";

    const visible = mediaAssets.filter((asset) => {
      const matchesType = type === "all" || asset.content_type === type;
      const haystack = `${asset.filename || ""} ${asset.alt_text || ""}`.toLowerCase();
      return matchesType && (!query || haystack.includes(query));
    });

    visible.sort((a, b) => {
      if (sort === "oldest") return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      if (sort === "name-asc") return String(a.filename).localeCompare(String(b.filename));
      if (sort === "name-desc") return String(b.filename).localeCompare(String(a.filename));
      if (sort === "largest") return Number(b.size_bytes) - Number(a.size_bytes);
      if (sort === "smallest") return Number(a.size_bytes) - Number(b.size_bytes);
      return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    });

    if (count) {
      count.textContent = visible.length === mediaAssets.length
        ? `${visible.length} ${visible.length === 1 ? "image" : "images"}`
        : `${visible.length} of ${mediaAssets.length} images`;
    }

    if (!mediaAssets.length) {
      container.innerHTML = renderEmptyCard("No images uploaded yet.");
      return;
    }

    if (!visible.length) {
      container.innerHTML = renderEmptyCard("No images match these filters.");
      return;
    }

    container.innerHTML = visible.map(renderMediaCard).join("");
    setupMediaCardButtons(container);
  }

  function renderMediaCard(asset) {
    return `
      <article class="card admin-media-card">
        <img src="${escapeAttr(asset.url)}" alt="${escapeAttr(asset.alt_text || "")}" loading="lazy" />
        <div class="admin-media-card__body">
          <h3>${escapeHtml(asset.filename)}</h3>
          <p class="card__meta">${escapeHtml(formatBytes(asset.size_bytes))} · ${escapeHtml(asset.content_type)}</p>
          ${asset.alt_text ? `<p>${escapeHtml(asset.alt_text)}</p>` : ""}
          <code>${escapeHtml(asset.url)}</code>
          <div class="card__actions">
            <button class="btn btn--small btn--primary" type="button" data-media-copy data-media-url="${escapeAttr(asset.url)}">Copy Path</button>
            <button class="btn btn--small" type="button" data-media-rename data-media-key="${escapeAttr(asset.reference || asset.key)}" data-media-name="${escapeAttr(asset.filename)}">Rename</button>
            <button class="btn btn--small btn--danger" type="button" data-media-delete data-media-key="${escapeAttr(asset.reference || asset.key)}" data-media-name="${escapeAttr(asset.filename)}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }

  function setupMediaCardButtons(container) {
    container.querySelectorAll("[data-media-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.dataset.mediaUrl || "";
        try {
          await navigator.clipboard.writeText(value);
          button.textContent = "Copied";
        } catch {
          window.prompt("Copy this image path:", value);
        }
      });
    });

    container.querySelectorAll("[data-media-rename]").forEach((button) => {
      button.addEventListener("click", async () => {
        const key = button.dataset.mediaKey || "";
        const currentName = button.dataset.mediaName || "image";
        const nextName = window.prompt("Rename this media item:", currentName);
        if (!key || nextName === null || !nextName.trim() || nextName.trim() === currentName) {
          return;
        }

        button.disabled = true;
        button.textContent = "Renaming…";

        try {
          const response = await adminFetch(
            `/api/admin/media/${encodeURIComponent(key)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: nextName.trim() }),
            }
          );
          const data = await readJsonSafe(response);
          if (!response.ok || !data.ok) {
            throw new Error(data.error || `Rename failed: ${response.status}`);
          }
          await loadAdminMedia();
        } catch (error) {
          console.error(error);
          window.alert(error.message || "Failed to rename image.");
          button.disabled = false;
          button.textContent = "Rename";
        }
      });
    });

    container.querySelectorAll("[data-media-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const key = button.dataset.mediaKey || "";
        const name = button.dataset.mediaName || "this image";
        if (!key || !window.confirm(`Delete “${name}” from R2? Existing pages using it will lose the image.`)) return;

        button.disabled = true;
        try {
          const response = await adminFetch(`/api/admin/media/${encodeURIComponent(key)}`, { method: "DELETE" });
          const data = await readJsonSafe(response);
          if (!response.ok || !data.ok) {
            throw new Error(data.error || `Delete failed: ${response.status}`);
          }
          await loadAdminMedia();
        } catch (error) {
          console.error(error);
          window.alert(error.message || "Failed to delete image.");
          button.disabled = false;
        }
      });
    });
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ---------------- HELPERS ---------------- */

  function setNextDisplayOrder(collection, items, formId) {
    const nextOrder = items.reduce(
      (highest, item) => Math.max(highest, Number(item.display_order) + 1 || 0),
      0
    );
    nextDisplayOrder.set(collection, nextOrder);

    const form = document.getElementById(formId);
    if (form && !String(form.elements[formId === "adminCaseStudyForm" ? "case_study_id" :
      formId === "adminProjectForm" ? "project_id" :
      formId === "adminBlogForm" ? "blog_id" : "workshop_id"]?.value || "")) {
      form.elements["display_order"].value = String(nextOrder);
    }
  }

  function renderOrderControls(title) {
    const label = escapeAttr(title || "item");
    return `
      <div class="admin-order-controls">
        <button
          class="admin-order-handle"
          type="button"
          draggable="true"
          aria-label="Drag to reorder ${label}"
          title="Drag to reorder"
        >⠿</button>
        <span class="admin-order-position" data-order-position></span>
        <button class="admin-order-step" type="button" data-order-move="-1" aria-label="Move ${label} earlier" title="Move earlier">↑</button>
        <button class="admin-order-step" type="button" data-order-move="1" aria-label="Move ${label} later" title="Move later">↓</button>
      </div>
    `;
  }

  function setupReorderableList(container, { collection, reload }) {
    let draggedCard = null;
    let startingOrder = "";

    updateOrderPositions(container);

    container.querySelectorAll("[data-order-move]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (container.classList.contains("is-saving-order")) return;
        const card = button.closest("[data-reorder-id]");
        const direction = Number(button.dataset.orderMove);
        const sibling = direction < 0
          ? card?.previousElementSibling
          : card?.nextElementSibling;
        if (!card || !sibling?.matches("[data-reorder-id]")) return;

        if (direction < 0) container.insertBefore(card, sibling);
        else container.insertBefore(sibling, card);
        updateOrderPositions(container);
        await saveContentOrder(container, collection, reload);
      });
    });

    container.querySelectorAll(".admin-order-handle").forEach((handle) => {
      handle.addEventListener("dragstart", (event) => {
        draggedCard = handle.closest("[data-reorder-id]");
        if (!draggedCard || container.classList.contains("is-saving-order")) {
          event.preventDefault();
          return;
        }

        startingOrder = readOrderIds(container).join(",");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedCard.dataset.reorderId || "");
        requestAnimationFrame(() => draggedCard?.classList.add("is-dragging"));
      });

      handle.addEventListener("dragend", async () => {
        draggedCard?.classList.remove("is-dragging");
        const changed = startingOrder !== readOrderIds(container).join(",");
        draggedCard = null;
        startingOrder = "";
        updateOrderPositions(container);
        if (changed) await saveContentOrder(container, collection, reload);
      });
    });

    container.addEventListener("dragover", (event) => {
      if (!draggedCard) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      const target = event.target.closest("[data-reorder-id]");
      if (!target || target === draggedCard || target.parentElement !== container) return;

      const bounds = target.getBoundingClientRect();
      const nearSameRow = Math.abs(event.clientY - (bounds.top + bounds.height / 2)) < bounds.height * 0.25;
      const insertBefore = nearSameRow
        ? event.clientX < bounds.left + bounds.width / 2
        : event.clientY < bounds.top + bounds.height / 2;

      container.insertBefore(draggedCard, insertBefore ? target : target.nextElementSibling);
      updateOrderPositions(container);
    });

    container.addEventListener("drop", (event) => {
      if (draggedCard) event.preventDefault();
    });
  }

  function readOrderIds(container) {
    return [...container.querySelectorAll(":scope > [data-reorder-id]")]
      .map((card) => Number(card.dataset.reorderId));
  }

  function updateOrderPositions(container) {
    const cards = [...container.querySelectorAll(":scope > [data-reorder-id]")];
    cards.forEach((card, index) => {
      setText(card.querySelector("[data-order-position]"), `Position ${index + 1}`);
      const up = card.querySelector('[data-order-move="-1"]');
      const down = card.querySelector('[data-order-move="1"]');
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === cards.length - 1;
    });
  }

  async function saveContentOrder(container, collection, reload) {
    const ids = readOrderIds(container);
    container.classList.add("is-saving-order");
    container.setAttribute("aria-busy", "true");

    try {
      const response = await adminFetch("/api/admin/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, ids }),
      });
      const data = await readJsonSafe(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Reorder failed: ${response.status}`);
      }
      await reload();
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Failed to save the new order.");
      await reload();
    } finally {
      container.classList.remove("is-saving-order");
      container.removeAttribute("aria-busy");
    }
  }

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

  function parseJsonArray(value) {
    try {
      const parsed = JSON.parse(String(value || "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
