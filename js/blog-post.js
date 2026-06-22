// js/blog-post.js
(() => {
  const postContainer = document.querySelector("[data-blog-post]");
  if (!postContainer) return;

  loadBlogPost();

  async function loadBlogPost() {
    const slug = getSlugFromUrl();

    if (!slug) {
      postContainer.innerHTML = renderErrorState("No blog post was selected.");
      return;
    }

    try {
      const response = await fetch(`/api/blog/${encodeURIComponent(slug)}`);

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
        "This blog post could not be loaded."
      );
    }
  }

  function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug");
  }

  function renderBlogPost(post) {
    document.title = `${post.title} | Jason Leonard`;

    postContainer.innerHTML = `
      <header>
        <p class="card__meta">${formatDate(post.created_at)}</p>
        <h1>${escapeHtml(post.title)}</h1>
      </header>

      <p class="section-lead">
        ${escapeHtml(post.excerpt)}
      </p>

      <div class="card" style="margin-top: 1.5rem;">
        ${renderContent(post.content)}
      </div>
    `;
  }

  function renderContent(content) {
    return String(content ?? "")
      .split("\n")
      .filter((paragraph) => paragraph.trim().length > 0)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
  }

  function renderErrorState(message) {
    return `
      <h1>Post unavailable</h1>
      <p>${escapeHtml(message)}</p>
    `;
  }

  function formatDate(value) {
    if (!value) return "Draft";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Draft";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
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
})();