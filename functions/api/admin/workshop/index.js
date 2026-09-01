import { requireAdmin } from "../../../../lib/admin-auth.js";

export async function onRequestGet(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const { results } = await context.env.DB.prepare(
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
      ORDER BY display_order ASC, created_at DESC
      `
    ).all();

    return json({ ok: true, workshop_items: results });
  } catch (error) {
    console.error(error);
    return json(
      { ok: false, error: "Failed to load admin workshop items." },
      500
    );
  }
}

export async function onRequestPost(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const db = context.env.DB;
    const data = await context.request.json();

    const steamId = String(data.steam_id || "").trim();
    const title = String(data.title || "").trim();
    const game = String(data.game || "").trim();
    const description = String(data.description || "").trim();
    const workshopUrl = String(data.workshop_url || "").trim();
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;
    const isPublished = data.is_published ? 1 : 0;

    if (!steamId || !title || !game || !description || !workshopUrl) {
      return json(
        {
          ok: false,
          error:
            "Steam ID, title, game, description, and workshop URL are required.",
        },
        400
      );
    }

    const result = await db
      .prepare(
        `
        INSERT INTO workshop_items (
          steam_id,
          title,
          game,
          description,
          workshop_url,
          display_order,
          is_published
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        steamId,
        title,
        game,
        description,
        workshopUrl,
        displayOrder,
        isPublished
      )
      .run();

    return json({
      ok: true,
      message: "Workshop item created.",
      result,
    });
  } catch (error) {
    console.error(error);

    const message = String(error.message || error);

    if (message.includes("UNIQUE constraint failed")) {
      return json(
        {
          ok: false,
          error: "A workshop item with this Steam ID already exists.",
        },
        409
      );
    }

    return json(
      {
        ok: false,
        error: "Failed to create workshop item.",
        detail: message,
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
