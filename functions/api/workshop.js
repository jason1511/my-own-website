import { hobbyFiles } from "../../lib/hobby-files.js";
export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const { results } = await db
      .prepare(
        `
        SELECT *
        FROM workshop_items
        WHERE is_published = 1
        ORDER BY display_order ASC, created_at DESC
        `
      )
      .all();

    return json({
      ok: true,
      workshop_items: results.map(item => ({ ...item, files: hobbyFiles(item) })),
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
      "Cache-Control": "no-store",
    },
  });
}
