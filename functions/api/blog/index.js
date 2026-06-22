export async function onRequestPost(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const db = context.env.DB;
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

    const result = await db
      .prepare(
        `
        INSERT INTO blog_posts (
          title,
          slug,
          excerpt,
          content,
          cover_image_key,
          is_published,
          display_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        title,
        slug,
        excerpt,
        content,
        coverImageKey,
        isPublished,
        displayOrder
      )
      .run();

    return json({
      ok: true,
      message: "Blog post created.",
      result,
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
        error: "Failed to create blog post.",
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