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
          summary,
          body,
          type,
          tech_stack,
          github_url,
          live_url,
          image_key,
          is_featured,
          is_published,
          display_order,
          created_at,
          updated_at
        FROM projects
        WHERE is_published = 1
        ORDER BY display_order ASC, created_at DESC
        `
      )
      .all();

    return json({
      ok: true,
      projects: results,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to load projects",
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