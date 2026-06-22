export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const slug = context.params.slug;

    if (!slug) {
      return json(
        {
          ok: false,
          error: "Missing blog slug",
        },
        400
      );
    }

    const post = await db
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
        WHERE slug = ?
          AND is_published = 1
        LIMIT 1
        `
      )
      .bind(slug)
      .first();

    if (!post) {
      return json(
        {
          ok: false,
          error: "Blog post not found",
        },
        404
      );
    }

    return json({
      ok: true,
      post,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to load blog post",
        detail: String(error.message || error),
      },
      500
    );
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}