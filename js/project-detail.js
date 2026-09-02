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
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok || !data.project) {
        throw new Error(
          response.status === 404
            ? "Project not found."
            : data?.error || "Unable to load this project."
        );
      }

      renderProject(data.project);
    } catch (error) {
      console.error("Project loading failed:", error);
      showError(error.message || "Unable to load this project.");
    }
  }

  function renderProject(project) {
    setText("[data-project-title]", project.title || "Untitled project");
    setText(
      "[data-project-type]",
      formatLabel(project.type || "Software project")
    );
    setText("[data-project-summary]", project.summary || "");

    renderCover(project);
    renderFacts(project);
    renderTechnologies(project.tech_stack);
    renderBody(project);
    renderActions(project);

    document.title = `${project.title || "Project"} | Jason Leonard`;
    updateDescription(project.summary);

    statusElement.hidden = true;
    projectElement.hidden = false;
  }

  function renderCover(project) {
    const figure = document.querySelector("[data-project-cover]");
    const image = document.querySelector("[data-project-cover-image]");
    const caption = document.querySelector("[data-project-cover-caption]");
    const url = safeImageUrl(
      project.image_key || project.cover_image_url || project.thumbnail_url
    );

    if (!figure || !image) return;
    figure.hidden = !url;
    if (!url) return;

    image.src = url;
    image.alt = String(
      project.cover_image_alt || project.title + " project screenshot"
    ).trim();

    const captionText = String(project.cover_image_caption || "").trim();
    if (caption) {
      caption.textContent = captionText;
      caption.hidden = !captionText;
    }
  }

  function renderFacts(project) {
    const container = document.querySelector("[data-project-facts]");
    if (!container) return;

    const facts = [
      ["Type", formatLabel(project.type)],
      ["Role", project.role],
      ["Platform", project.platform],
      ["Status", project.project_status || project.status],
      ["Timeline", project.timeline],
      ["Users", project.intended_users],
    ].filter(([, value]) => String(value || "").trim());

    container.replaceChildren();

    for (const [label, value] of facts) {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      wrapper.append(term, description);
      container.append(wrapper);
    }

    container.hidden = facts.length === 0;
  }

  function renderTechnologies(value) {
    const container = document.querySelector("[data-project-technologies]");
    if (!container) return;

    const technologies = splitList(value);
    container.replaceChildren();

    for (const technology of technologies) {
      const item = document.createElement("li");
      item.textContent = technology;
      container.append(item);
    }

    container.hidden = technologies.length === 0;
  }

  function renderBody(project) {
    const container = document.querySelector("[data-project-body]");
    if (!container) return;

    const sections = Array.isArray(project.content_sections)
      ? project.content_sections
      : [];

    container.replaceChildren();

    if (sections.length) {
      sections.forEach((section, index) => {
        const rendered = renderStructuredSection(section, index);
        if (rendered) container.append(rendered);
      });
    } else {
      container.append(
        renderOverviewSection(project.body || project.summary || "", 0)
      );
    }

    const screenshots = normalizeScreenshots(
      project.screenshots || project.gallery || project.images
    );

    if (screenshots.length) {
      container.append(renderScreenshotSection(screenshots, container.children.length));
    }

    buildTableOfContents();
  }

  function renderOverviewSection(content, index) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.id = "project-overview";
    heading.textContent = "Overview";
    section.append(heading);

    const paragraphs = splitParagraphs(content);
    if (!paragraphs.length) {
      paragraphs.push("More information about this project will be added soon.");
    }

    for (const text of paragraphs) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      section.append(paragraph);
    }

    return section;
  }

  function renderStructuredSection(section, index) {
    if (!section || typeof section !== "object") return null;

    const title = String(section.title || "").trim();
    const body = String(section.body || "").trim();
    const bullets = Array.isArray(section.bullets)
      ? section.bullets.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const imageUrl = safeImageUrl(section.image_url);

    if (!title && !body && !bullets.length && !imageUrl) return null;

    const sectionElement = document.createElement("section");
    const heading = document.createElement("h2");
    const headingText = title || `Project section ${index + 1}`;

    heading.id = createHeadingId(headingText, index);
    heading.textContent = headingText;
    sectionElement.append(heading);

    for (const paragraphText of splitParagraphs(body)) {
      const paragraph = document.createElement("p");
      paragraph.textContent = paragraphText;
      sectionElement.append(paragraph);
    }

    if (bullets.length) {
      const list = document.createElement("ul");
      for (const itemText of bullets) {
        const item = document.createElement("li");
        item.textContent = itemText;
        list.append(item);
      }
      sectionElement.append(list);
    }

    if (imageUrl) {
      sectionElement.append(
        createMediaFigure(
          imageUrl,
          section.image_alt,
          section.image_caption
        )
      );
    }

    return sectionElement;
  }

  function normalizeScreenshots(value) {
    if (!Array.isArray(value)) return [];

    return value.map((item) => {
      if (typeof item === "string") {
        return { url: safeImageUrl(item), alt: "", caption: "" };
      }

      return {
        url: safeImageUrl(item?.image_url || item?.url || item?.src),
        alt: String(item?.image_alt || item?.alt || "").trim(),
        caption: String(item?.image_caption || item?.caption || "").trim(),
      };
    }).filter((item) => item.url);
  }

  function renderScreenshotSection(screenshots, index) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    const gallery = document.createElement("div");

    heading.id = "project-screenshots";
    heading.textContent = "Screenshots";
    gallery.className = screenshots.length > 1
      ? "article-gallery"
      : "article-gallery article-gallery--single";

    for (const screenshot of screenshots) {
      gallery.append(
        createMediaFigure(
          screenshot.url,
          screenshot.alt,
          screenshot.caption
        )
      );
    }

    section.append(heading, gallery);
    return section;
  }

  function createMediaFigure(url, altText, captionText) {
    const figure = document.createElement("figure");
    const image = document.createElement("img");

    figure.className = "article-media";
    image.src = url;
    image.alt = String(altText || "").trim();
    image.loading = "lazy";
    image.decoding = "async";
    figure.append(image);

    const caption = String(captionText || "").trim();
    if (caption) {
      const captionElement = document.createElement("figcaption");
      captionElement.textContent = caption;
      figure.append(captionElement);
    }

    return figure;
  }

  function buildTableOfContents() {
    const navigation = document.querySelector("[data-project-toc]");
    const list = document.querySelector("[data-project-toc-list]");
    const headings = document.querySelectorAll(
      "[data-project-body] > section > h2"
    );

    if (!navigation || !list) return;
    list.replaceChildren();

    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = createHeadingId(heading.textContent, index);
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.append(link);
      list.append(item);
    });

    navigation.hidden = headings.length < 2;
  }

  function renderActions(project) {
    const container = document.querySelector("[data-project-actions]");
    if (!container) return;

    const links = [
      [safeExternalUrl(project.live_url), "View live project"],
      [safeExternalUrl(project.github_url), "View on GitHub"],
    ];

    const caseStudySlug = String(project.case_study_slug || "")
      .trim()
      .toLowerCase();

    if (/^[a-z0-9-]+$/.test(caseStudySlug)) {
      links.push([
        `case-study.html?slug=${encodeURIComponent(caseStudySlug)}`,
        "Read case study",
      ]);
    } else if (isBikeStoreProject(project)) {
      links.push(["bike-store.html", "Read case study"]);
    }

    container.replaceChildren();

    for (const [url, label] of links) {
      if (!url) continue;
      const link = document.createElement("a");
      link.href = url;
      link.innerHTML = `${escapeHtml(label)} <span aria-hidden="true">${/^https?:/.test(url) ? "↗" : "→"}</span>`;

      if (/^https?:/.test(url)) {
        link.target = "_blank";
        link.rel = "noopener";
      }

      container.append(link);
    }

    container.hidden = container.childElementCount === 0;
  }

  function isBikeStoreProject(project) {
    return (
      slug.includes("bike-store") ||
      String(project.title || "").toLowerCase().includes("bike store")
    );
  }

  function splitParagraphs(value) {
    return String(value || "")
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatLabel(value) {
    return String(value || "")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function createHeadingId(value, index) {
    const id = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `project-section-${index + 1}-${id || "details"}`;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function safeExternalUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value).trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeImageUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value).trim(), window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showError(message) {
    statusElement.textContent = message;
    statusElement.classList.add("project-detail__status--error");
    projectElement.hidden = true;
    document.title = "Project not found | Jason Leonard";
  }
})();
