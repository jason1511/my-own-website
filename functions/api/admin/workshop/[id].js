import { ensureHobbyMedia, normalizeHobbyImage } from "../../../../lib/hobby-media.js";
import { hobbyLinkIdentity } from "../../../../lib/hobby-link.js";

import { requireAdmin } from "../../../../lib/admin-auth.js";

export async function onRequestPut(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json(
        {
          ok: false,
          error: "Invalid workshop item ID.",
        },
        400
      );
    }

    const data = await context.request.json();
    let imageKey;
    try { imageKey = normalizeHobbyImage(data.image_key); }
    catch (error) { return json({ ok: false, error: error.message }, 400); }
    const imageAlt = String(data.image_alt || "").trim().slice(0, 300);
    await ensureHobbyMedia(db);

    let steamId;
    const title = String(data.title || "").trim();
    const game = String(data.game || "").trim();
    const description = String(data.description || "").trim();
    const workshopUrl = String(data.workshop_url || "").trim();
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;
    const isPublished = data.is_published ? 1 : 0;

    try {
      steamId = hobbyLinkIdentity(workshopUrl, data.steam_id);
    } catch (error) {
      return json({ ok: false, error: error.message }, 400);
    }

    if (!title || !game || !description || !workshopUrl) {
      return json(
        {
          ok: false,
          error:
            "Title, game/platform, description, and project URL are required.",
        },
        400
      );
    }

    const existing = await db
      .prepare(
        `
        SELECT id
        FROM workshop_items
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
          error: "Workshop item not found.",
        },
        404
      );
    }

    await db
      .prepare(
        `
        UPDATE workshop_items
        SET
          steam_id = ?,
          title = ?,
          game = ?,
          description = ?,
          workshop_url = ?,
          image_key = ?,
          image_alt = ?,
          display_order = ?,
          is_published = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
      .bind(
        steamId,
        title,
        game,
        description,
        workshopUrl,
        imageKey,
        imageAlt,
        displayOrder,
        isPublished,
        id
      )
      .run();

    const updatedItem = await db
      .prepare(
        `
        SELECT
          id,
          steam_id,
          title,
          game,
          description,
          workshop_url,
          image_key,
          image_alt,
          display_order,
          is_published,
          created_at,
          updated_at
        FROM workshop_items
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    return json({
      ok: true,
      message: "Workshop item updated.",
      workshop_item: updatedItem,
    });
  } catch (error) {
    console.error(error);

    const message = String(error.message || error);

    if (message.includes("UNIQUE constraint failed")) {
      return json(
        {
          ok: false,
          error: "A hobby project with this Steam ID or external URL already exists.",
        },
        409
      );
    }

    return json(
      {
        ok: false,
        error: "Failed to update workshop item.",
        detail: message,
      },
      500
    );
  }
}

export async function onRequestDelete(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json({ ok: false, error: "Invalid workshop item ID." }, 400);
    }

    const existing = await db
      .prepare(
        "SELECT id, title, steam_id FROM workshop_items WHERE id = ? LIMIT 1"
      )
      .bind(id)
      .first();

    if (!existing) {
      return json({ ok: false, error: "Workshop item not found." }, 404);
    }

    await db.prepare("DELETE FROM workshop_items WHERE id = ?").bind(id).run();

    return json({
      ok: true,
      message: "Workshop item deleted.",
      workshop_item: existing,
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to delete workshop item." }, 500);
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
