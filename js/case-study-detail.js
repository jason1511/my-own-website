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
      caseStudy.project_title || "Project case study"
    );
    setText("[data-case-study-summary]", caseStudy.summary || "");

    renderTechnologies(caseStudy.tech_stack);
    renderSection("problem", caseStudy.problem);
    renderSection("solution", caseStudy.solution);
    renderSection("key_features", caseStudy.key_features, true);
    renderSection("technical_details", caseStudy.technical_details);
    renderSection("challenges", caseStudy.challenges);
    renderSection("learnings", caseStudy.learnings);
    renderActions(caseStudy);

    document.title = `${caseStudy.title} | Jason Leonard`;
    updateDescription(caseStudy.summary);
    statusElement.hidden = true;
    detailElement.hidden = false;
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
