// js/blog.js
(() => {
  const blogList = document.querySelector("[data-blog-list]");
  if (!blogList) return;

  loadBlogPosts();

  async function loadBlogPosts() {
    try {
      const response = await fetch("/api/blog");

      if (!response.ok) {
        throw new Error(`Blog API failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok || !Array.isArray(data.blog_posts)) {
        throw new Error("Invalid blog API response");
      }

      renderBlogPosts(data.blog_posts);
    } catch (error) {
      console.error(error);
      blogList.innerHTML = renderErrorState();
    }
  }

  function renderBlogPosts(posts) {
    if (posts.length === 0) {
      blogList.innerHTML = renderEmptyState();
      return;
    }

    blogList.innerHTML = posts.map(renderBlogCard).join("");
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
        <p>Blog posts will appear here once published.</p>
      </article>
    `;
  }

  function renderErrorState() {
    return `
      <article class="card">
        <h3>Unable to load posts</h3>
        <p>Blog posts could not be loaded right now. Please try again later.</p>
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