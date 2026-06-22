export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const { results } = await db
      .prepare(
        `
        SELECT
          id,
          steam_id,
          title,
          game,
          description,
          workshop_url,
          display_order,
          is_published,
          created_at,
          updated_at
        FROM workshop_items
        WHERE is_published = 1
        ORDER BY display_order ASC, created_at DESC
        `
      )
      .all();

    return json({
      ok: true,
      workshop_items: results,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to load workshop items",
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