// js/project-detail.js
(() => {
  const statusElement = document.querySelector("[data-project-status]");
  const projectElement = document.querySelector("[data-project-detail]");

  if (!statusElement || !projectElement) return;

  const params = new URLSearchParams(window.location.search);
  const slug = String(params.get("slug") || "").trim().toLowerCase();

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    showError("No valid project was selected.");
    return;
  }

  loadProject();

  async function loadProject() {
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(slug)}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok || !data.project) {
        if (response.status === 404) {
          throw new Error("Project not found.");
        }

        throw new Error(data?.error || "Unable to load this project.");
      }

      renderProject(data.project);
    } catch (error) {
      console.error("Project loading failed:", error);
      showError(error.message || "Unable to load this project.");
    }
  }

  function renderProject(project) {
    const titleElement = document.querySelector("[data-project-title]");
    const typeElement = document.querySelector("[data-project-type]");
    const summaryElement = document.querySelector("[data-project-summary]");
    const technologiesElement = document.querySelector(
      "[data-project-technologies]"
    );
    const bodyElement = document.querySelector("[data-project-body]");
    const actionsElement = document.querySelector("[data-project-actions]");

    titleElement.textContent = project.title || "Untitled project";
    typeElement.textContent = project.type || "Software project";
    summaryElement.textContent = project.summary || "";

    renderTechnologies(technologiesElement, project.tech_stack);
    renderBody(bodyElement, project.body, project.summary);
    renderActions(actionsElement, project);

    document.title = `${project.title} | Jason Leonard`;
    updateDescription(project.summary);

    statusElement.hidden = true;
    projectElement.hidden = false;
  }

  function renderTechnologies(container, techStack) {
    container.replaceChildren();

    const technologies = String(techStack || "")
      .split(",")
      .map((technology) => technology.trim())
      .filter(Boolean);

    for (const technology of technologies) {
      const item = document.createElement("li");
      item.className = "tag";
      item.textContent = technology;
      container.append(item);
    }

    container.hidden = technologies.length === 0;
  }

  function renderBody(container, body, summary) {
    container.replaceChildren();

    const content = String(body || summary || "").trim();

    if (!content) {
      const paragraph = document.createElement("p");
      paragraph.textContent =
        "More information about this project will be added soon.";
      container.append(paragraph);
      return;
    }

    const paragraphs = content
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    for (const paragraphText of paragraphs) {
      const paragraph = document.createElement("p");
      paragraph.textContent = paragraphText;
      container.append(paragraph);
    }
  }

  function renderActions(container, project) {
    container.replaceChildren();

    const liveUrl = safeExternalUrl(project.live_url);
    const githubUrl = safeExternalUrl(project.github_url);

    if (liveUrl) {
      container.append(
        createExternalLink(liveUrl, "View live project", true)
      );
    }

    if (githubUrl) {
      container.append(
        createExternalLink(githubUrl, "View on GitHub", false)
      );
    }

    container.hidden = !liveUrl && !githubUrl;
  }

  function createExternalLink(url, label, primary) {
    const link = document.createElement("a");

    link.className = primary ? "btn btn--primary" : "btn";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = label;

    return link;
  }

  function safeExternalUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value).trim());

      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function updateDescription(summary) {
    const description = document.querySelector('meta[name="description"]');

    if (description && summary) {
      description.setAttribute("content", String(summary));
    }
  }

  function showError(message) {
    statusElement.textContent = message;
    statusElement.classList.add("project-detail__status--error");
    projectElement.hidden = true;
    document.title = "Project not found | Jason Leonard";
  }
})();