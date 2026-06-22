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
    const slug = String(data.slug || "").trim();
    const excerpt = String(data.excerpt || "").trim();
    const content = String(data.content || "").trim();
    const coverImageKey = String(data.cover_image_key || "").trim();
    const isPublished = data.is_published ? 1 : 0;
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;

    if (!title || !slug || !excerpt || !content) {
      return json(
        {
          ok: false,
          error: "Title, slug, excerpt, and content are required.",
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
          display_order = ?,
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
        displayOrder,
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
      post: updatedPost,
    });
  } catch (error) {
    console.error(error);

    const message = String(error.message || error);

    if (message.includes("UNIQUE constraint failed")) {
      return json(
        {
          ok: false,
          error: "A blog post with this slug already exists.",
        },
        409
      );
    }

    return json(
      {
        ok: false,
        error: "Failed to update blog post.",
        detail: message,
      },
      500
    );
  }
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