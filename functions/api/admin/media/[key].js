import { requireAdmin } from "../../../../lib/admin-auth.js";

export async function onRequestDelete(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    if (!context.env.MEDIA_BUCKET) {
      return json(
        { ok: false, error: "R2 is not connected yet.", code: "R2_NOT_CONFIGURED" },
        503
      );
    }

    const key = String(context.params.key || "").trim();
    if (!key || key.includes("/") || key.includes("\\")) {
      return json({ ok: false, error: "Invalid media key." }, 400);
    }

    const existing = await context.env.MEDIA_BUCKET.head(key);
    if (!existing) {
      return json({ ok: false, error: "Media asset not found." }, 404);
    }

    await context.env.MEDIA_BUCKET.delete(key);
    return json({ ok: true, message: "Image deleted." });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to delete the image." }, 500);
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
