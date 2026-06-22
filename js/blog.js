// js/blog.js
(() => {
  loadBlogPosts();

  async function loadBlogPosts() {
    const container = document.querySelector("[data-blog-list]");
    if (!container) return;

    try {
      const res = await fetch("/api/blog");
      if (!res.ok) throw new Error(`Blog API failed: ${res.status}`);

      const data = await res.json();

      if (!data.ok || !Array.isArray(data.blog_posts)) {
        throw new Error("Invalid blog API response");
      }

      if (data.blog_posts.length === 0) {
        container.innerHTML = renderEmptyState();
        return;
      }

      container.innerHTML = data.blog_posts.map(renderBlogCard).join("");
    } catch (error) {
      console.error(error);
      container.innerHTML = renderErrorState();
    }
  }

function renderBlogCard(post) {
  return `
    <article class="card">
      <header>
        <h3>${escapeHtml(post.title)}</h3>
        <p class="card__meta">${formatDate(post.created_at)}</p>
      </header>

      <p>${escapeHtml(post.excerpt)}</p>

      <div class="card__actions">
        <a
          class="btn btn--small btn--primary"
          href="blog-post.html?slug=${encodeURIComponent(post.slug)}"
        >
          Read Post
        </a>
      </div>
    </article>
  `;
}

  function renderEmptyState() {
    return `
      <article class="card">
        <h3>No posts yet</h3>
        <p>
          Blog posts will appear here once published.
        </p>
      </article>
    `;
  }

  function renderErrorState() {
    return `
      <article class="card">
        <h3>Unable to load posts</h3>
        <p>
          Blog posts could not be loaded right now. Please try again later.
        </p>
      </article>
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