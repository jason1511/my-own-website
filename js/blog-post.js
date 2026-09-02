// js/blog-post.js
(() => {
  const postContainer = document.querySelector("[data-blog-post]");
  if (!postContainer) return;

  loadBlogPost();

  async function loadBlogPost() {
    const slug = getSlugFromUrl();

    if (!slug) {
      postContainer.innerHTML = renderErrorState("No development note was selected.");
      return;
    }

    try {
      const response = await fetch(`/api/blog/${encodeURIComponent(slug)}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Blog post API failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok || !data.post) {
        throw new Error("Invalid blog post API response");
      }

      renderBlogPost(data.post);
    } catch (error) {
      console.error(error);
      postContainer.innerHTML = renderErrorState(
        "This development note could not be loaded."
      );
    }
  }

  function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug");
  }

  function renderBlogPost(post) {
    document.title = `${post.title} | Jason Leonard`;
    updateDescription(post.excerpt);

    const coverUrl = safeImageUrl(
      post.cover_image_key || post.image_key || post.cover_image_url || post.thumbnail_url
    );

    postContainer.innerHTML = `
      <header class="article-header">
        <p class="article-eyebrow">
          Development note · ${escapeHtml(formatDate(post.created_at))}
        </p>
        <h1>${escapeHtml(post.title)}</h1>
        ${post.excerpt
          ? `<p class="article-lead">${escapeHtml(post.excerpt)}</p>`
          : ""}
      </header>

      ${coverUrl
        ? `<figure class="article-cover">
            <img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(post.cover_image_alt || post.title + " cover image")}" />
            ${post.cover_image_caption
              ? `<figcaption>${escapeHtml(post.cover_image_caption)}</figcaption>`
              : ""}
          </figure>`
        : ""}

      <div class="article-body article-prose">
        ${renderPostBody(post)}
      </div>

      <div class="article-actions">
        <a href="writing.html?type=note">
          More development notes <span aria-hidden="true">→</span>
        </a>
      </div>
    `;
  }

  function renderPostBody(post) {
    if (Array.isArray(post.content_sections) && post.content_sections.length) {
      return post.content_sections.map(renderStructuredSection).join("");
    }

    return `<section>${renderParagraphs(post.content)}</section>`;
  }

  function renderStructuredSection(section, index) {
    if (!section || typeof section !== "object") return "";

    const title = String(section.title || "").trim();
    const body = String(section.body || "").trim();
    const imageUrl = safeImageUrl(section.image_url);
    const bullets = Array.isArray(section.bullets)
      ? section.bullets.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!title && !body && !imageUrl && !bullets.length) return "";

    return `
      <section>
        ${title
          ? `<h2>${escapeHtml(title)}</h2>`
          : ""}
        ${renderParagraphs(body)}
        ${bullets.length
          ? `<ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
          : ""}
        ${imageUrl
          ? `<figure class="article-media">
              <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(section.image_alt || "")}" loading="lazy" />
              ${section.image_caption
                ? `<figcaption>${escapeHtml(section.image_caption)}</figcaption>`
                : ""}
            </figure>`
          : ""}
      </section>
    `;
  }

  function renderParagraphs(content) {
    return String(content ?? "")
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
  }

  function renderErrorState(message) {
    return `
      <header class="article-header">
        <p class="article-eyebrow">Development note</p>
        <h1>Post unavailable</h1>
        <p class="article-lead">${escapeHtml(message)}</p>
      </header>
    `;
  }

  function safeImageUrl(value) {
    if (!value) return "";

    try {
      const parsed = new URL(String(value).trim(), window.location.origin);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function updateDescription(value) {
    const description = document.querySelector('meta[name="description"]');
    if (description && value) description.setAttribute("content", String(value));
  }

  function formatDate(value) {
    if (!value) return "Draft";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Draft";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
