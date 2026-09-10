import { normalizeDependencies, hobbyDependencies } from "../../../../lib/hobby-dependencies.js";
import { normalizeHobbyFiles, hobbyFiles, withHobbyFiles } from "../../../../lib/hobby-files.js";
import { ensureHobbyMedia, normalizeHobbyImage, normalizeHobbyGallery, normalizeModDownload } from "../../../../lib/hobby-media.js";
import { hobbyLinkIdentity } from "../../../../lib/hobby-link.js";

import { requireAdmin } from "../../../../lib/admin-auth.js";

export async function onRequestGet(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    await ensureHobbyMedia(context.env.DB);

    const { results } = await context.env.DB.prepare(
      `
      SELECT
        id,
        steam_id,
        title,
        game,
        description,
        body,
        workshop_url,
        image_key,
        image_alt,
          screenshots,
          download_url,
          files,
          dependencies,
        display_order,
        is_published,
        created_at,
        updated_at
      FROM workshop_items
      ORDER BY display_order ASC, created_at DESC
      `
    ).all();

    return json({ ok: true, workshop_items: await Promise.all(results.map(item => withHobbyFiles(item, context.env.MEDIA_BUCKET))) });
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
    let imageKey, screenshots, downloadUrl, files, dependencies;
    try {
      imageKey = normalizeHobbyImage(data.image_key);
      screenshots = JSON.stringify(normalizeHobbyGallery(data.screenshots));
      files = normalizeHobbyFiles((data.files === undefined ? hobbyFiles(data) : data.files));
      dependencies = normalizeDependencies(data.dependencies === undefined ? hobbyDependencies(data) : data.dependencies);
      downloadUrl = files[0]?.url || "";
    }
    catch (error) { return json({ ok: false, error: error.message }, 400); }
    const imageAlt = String(data.image_alt || "").trim().slice(0, 300);
    await ensureHobbyMedia(db);

    let steamId;
    const title = String(data.title || "").trim();
    const game = String(data.game || "").trim();
    const description = String(data.description || "").trim();
    const body = String(data.body || "").trim().slice(0, 20000);
    const workshopUrl = String(data.workshop_url || "").trim();
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;
    const isPublished = data.is_published ? 1 : 0;

    try {
      steamId = hobbyLinkIdentity(workshopUrl || new URL(downloadUrl, context.request.url).href, data.steam_id);
    } catch (error) {
      return json({ ok: false, error: error.message }, 400);
    }

    if (!title || !game || !description || (!workshopUrl && !downloadUrl)) {
      return json(
        {
          ok: false,
          error:
            "Title, game/platform, description, and a project link or uploaded archive are required.",
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
          body,
          workshop_url,
          image_key,
          image_alt,
          screenshots,
          download_url,
          files,
          dependencies,
          display_order,
          is_published
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        steamId,
        title,
        game,
        description,
        body,
        workshopUrl,
        imageKey,
        imageAlt,
        screenshots,
        downloadUrl,
        JSON.stringify(files),
        JSON.stringify(dependencies),
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
          error: "A hobby project with this Steam ID or external URL already exists.",
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
