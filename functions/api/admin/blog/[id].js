export async function onRequestPut(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json(
        {
          ok: false,
          error: "Invalid blog post ID.",
        },
        400
      );
    }

    const data = await context.request.json();

    const title = String(data.title || "").trim();
    const excerpt = String(data.excerpt || "").trim();
    const content = String(data.content || "").trim();
    const coverImageKey = String(data.cover_image_key || "").trim();
    const isPublished = data.is_published ? 1 : 0;

    if (!title || !excerpt || !content) {
      return json(
        {
          ok: false,
          error: "Title, excerpt, and content are required.",
        },
        400
      );
    }

    const existing = await db
      .prepare(
        `
        SELECT id
        FROM blog_posts
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    if (!existing) {
      return json(
        {
          ok: false,
          error: "Blog post not found.",
        },
        404
      );
    }

    const slug = await createUniqueSlug(db, title, id);

    await db
      .prepare(
        `
        UPDATE blog_posts
        SET
          title = ?,
          slug = ?,
          excerpt = ?,
          content = ?,
          cover_image_key = ?,
          is_published = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
      .bind(
        title,
        slug,
        excerpt,
        content,
        coverImageKey,
        isPublished,
        id
      )
      .run();

    const updatedPost = await db
      .prepare(
        `
        SELECT
          id,
          title,
          slug,
          excerpt,
          content,
          cover_image_key,
          is_published,
          display_order,
          created_at,
          updated_at
        FROM blog_posts
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    return json({
      ok: true,
      message: "Blog post updated.",
      slug,
      post: updatedPost,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to update blog post.",
        detail: String(error.message || error),
      },
      500
    );
  }
}

async function createUniqueSlug(db, title, currentPostId) {
  const baseSlug = slugify(title) || "blog-post";
  let slug = baseSlug;
  let counter = 2;

  while (await slugExists(db, slug, currentPostId)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function slugExists(db, slug, currentPostId) {
  const existing = await db
    .prepare(
      `
      SELECT id
      FROM blog_posts
      WHERE slug = ?
        AND id != ?
      LIMIT 1
      `
    )
    .bind(slug, currentPostId)
    .first();

  return Boolean(existing);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function checkAdminPassword(context) {
  const expectedPassword = context.env.ADMIN_PASSWORD;
  const providedPassword = context.request.headers.get("x-admin-password");

  if (!expectedPassword) {
    return json(
      {
        ok: false,
        error: "Admin password is not configured.",
      },
      500
    );
  }

  if (!providedPassword || providedPassword !== expectedPassword) {
    return json(
      {
        ok: false,
        error: "Unauthorized.",
      },
      401
    );
  }

  return null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}