export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const { results } = await db
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
        WHERE is_published = 1
        ORDER BY display_order ASC, created_at DESC
        `
      )
      .all();

    return json({
      ok: true,
      blog_posts: results,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to load blog posts",
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