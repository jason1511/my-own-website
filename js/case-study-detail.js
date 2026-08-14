// js/case-study-detail.js
(() => {
  const statusElement = document.querySelector("[data-case-study-status]");
  const detailElement = document.querySelector("[data-case-study-detail]");
  if (!statusElement || !detailElement) return;

  const params = new URLSearchParams(window.location.search);
  const slug = String(params.get("slug") || "").trim().toLowerCase();

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    showError("No valid case study was selected.");
    return;
  }

  loadCaseStudy();

  async function loadCaseStudy() {
    try {
      const response = await fetch(
        `/api/case-studies/${encodeURIComponent(slug)}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok || !data.case_study) {
        throw new Error(
          response.status === 404
            ? "Case study not found."
            : data?.error || "Unable to load this case study."
        );
      }

      renderCaseStudy(data.case_study);
    } catch (error) {
      console.error("Case study loading failed:", error);
      showError(error.message || "Unable to load this case study.");
    }
  }

  function renderCaseStudy(caseStudy) {
    setText("[data-case-study-title]", caseStudy.title || "Untitled case study");
    setText(
      "[data-case-study-project]",
      [caseStudy.project_type, caseStudy.project_title]
        .filter(Boolean)
        .join(" · ") || "Project case study"
    );
    setText("[data-case-study-summary]", caseStudy.summary || "");

    renderCover(caseStudy.image_key, caseStudy.cover_image_alt);
    renderFacts(caseStudy);
    renderTechnologies(caseStudy.tech_stack);

    if (
      Array.isArray(caseStudy.content_sections) &&
      caseStudy.content_sections.length
    ) {
      renderStructuredSections(caseStudy.content_sections);
    } else {
      renderSection("problem", caseStudy.problem);
      renderSection("solution", caseStudy.solution);
      renderSection("key_features", caseStudy.key_features, true);
      renderSection("technical_details", caseStudy.technical_details);
      renderSection("challenges", caseStudy.challenges);
      renderSection("learnings", caseStudy.learnings);
    }

    buildTableOfContents();
    renderActions(caseStudy);

    document.title = `${caseStudy.title} | Jason Leonard`;
    updateDescription(caseStudy.summary);
    statusElement.hidden = true;
    detailElement.hidden = false;
  }

  function renderCover(value, altText) {
    const figure = document.querySelector("[data-case-study-cover]");
    const image = document.querySelector("[data-case-study-cover-image]");
    const url = safeImageUrl(value);
    if (!figure || !image) return;

    figure.hidden = !url;
    if (!url) return;

    image.src = url;
    image.alt = String(altText || "").trim();
  }

  function renderFacts(caseStudy) {
    const container = document.querySelector("[data-case-study-facts]");
    if (!container) return;

    const facts = [
      ["Role", caseStudy.role],
      ["Project type", caseStudy.project_type],
      ["Users", caseStudy.intended_users],
      ["Platform", caseStudy.platform],
      ["Status", caseStudy.project_status],
      ["Timeline", caseStudy.timeline],
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
    const container = document.querySelector("[data-case-study-technologies]");
    const technologies = String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    container.replaceChildren();
    for (const technology of technologies) {
      const item = document.createElement("li");
      item.className = "tag";
      item.textContent = technology;
      container.append(item);
    }
    container.hidden = technologies.length === 0;
  }

  function renderSection(name, value, asList = false) {
    const section = document.querySelector(
      `[data-case-study-section="${name}"]`
    );
    const container = document.querySelector(
      `[data-case-study-content="${name}"]`
    );
    const content = String(value || "").trim();

    if (!section || !container) return;
    section.hidden = !content;
    container.replaceChildren();
    if (!content) return;

    if (asList) {
      const items = content
        .split(/\r?\n/)
        .map((item) => item.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);
      const list = document.createElement("ul");
      for (const itemText of items) {
        const item = document.createElement("li");
        item.textContent = itemText;
        list.append(item);
      }
      container.append(list);
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

  function renderStructuredSections(sections) {
    const container = document.querySelector(
      "[data-case-study-sections-container]"
    );
    if (!container) return;

    container.replaceChildren();

    sections.forEach((section, index) => {
      if (!section || typeof section !== "object") return;

      const title = String(section.title || "").trim();
      const body = String(section.body || "").trim();
      const bullets = Array.isArray(section.bullets)
        ? section.bullets.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const imageUrl = safeImageUrl(section.image_url);

      if (!title && !body && !bullets.length && !imageUrl) return;

      const sectionElement = document.createElement("section");
      const headingId = createHeadingId(title || `Section ${index + 1}`, index);

      if (title) {
        const heading = document.createElement("h2");
        heading.id = headingId;
        heading.textContent = title;
        sectionElement.append(heading);
      }

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
        const figure = document.createElement("figure");
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = String(section.image_alt || "").trim();
        image.loading = "lazy";
        image.decoding = "async";
        figure.append(image);

        const captionText = String(section.image_caption || "").trim();
        if (captionText) {
          const caption = document.createElement("figcaption");
          caption.textContent = captionText;
          figure.append(caption);
        }

        sectionElement.append(figure);
      }

      container.append(sectionElement);
    });
  }

  function splitParagraphs(value) {
    return String(value || "")
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  function createHeadingId(value, index) {
    const slug = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `section-${index + 1}-${slug || "details"}`;
  }

  function buildTableOfContents() {
    const navigation = document.querySelector("[data-case-study-toc]");
    const list = document.querySelector("[data-case-study-toc-list]");
    const headings = document.querySelectorAll(
      "[data-case-study-sections-container] > section:not([hidden]) > h2"
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

  function renderActions(caseStudy) {
    const container = document.querySelector("[data-case-study-actions]");
    const links = [
      [safeExternalUrl(caseStudy.live_url), "View live project", true],
      [safeExternalUrl(caseStudy.github_url), "View on GitHub", false],
    ];

    if (caseStudy.project_slug && /^[a-z0-9-]+$/.test(caseStudy.project_slug)) {
      links.unshift([
        `project.html?slug=${encodeURIComponent(caseStudy.project_slug)}`,
        "Project overview",
        false,
      ]);
    }

    container.replaceChildren();
    for (const [url, label, primary] of links) {
      if (!url) continue;
      const link = document.createElement("a");
      link.className = primary ? "btn btn--primary" : "btn";
      link.href = url;
      link.textContent = label;
      if (/^https?:/.test(url)) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      container.append(link);
    }
    container.hidden = container.childElementCount === 0;
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

  function showError(message) {
    statusElement.textContent = message;
    statusElement.classList.add("case-study-detail__status--error");
    detailElement.hidden = true;
    document.title = "Case study not found | Jason Leonard";
  }
})();
