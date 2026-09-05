import { requireAdmin } from "../../../../lib/admin-auth.js";
import { decodeMediaReference } from "../../../../lib/media-key.js";

const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

export async function onRequestPatch(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    if (!context.env.MEDIA_BUCKET) {
      return json(
        { ok: false, error: "R2 is not connected yet.", code: "R2_NOT_CONFIGURED" },
        503
      );
    }

    const key = readKey(context);
    if (!key) return json({ ok: false, error: "Invalid media key." }, 400);

    const body = await context.request.json().catch(() => null);
    const requestedName = String(body?.filename || "").trim();
    if (!requestedName) {
      return json({ ok: false, error: "Enter a media name." }, 400);
    }

    const existing = await context.env.MEDIA_BUCKET.get(key);
    if (!existing) {
      return json({ ok: false, error: "Media asset not found." }, 404);
    }

    const contentType = existing.httpMetadata?.contentType || "";
    const extension = IMAGE_EXTENSIONS.get(contentType) || key.split(".").pop() || "png";
    const filename = buildFilename(requestedName, extension);

    await context.env.MEDIA_BUCKET.put(key, existing.body, {
      httpMetadata: existing.httpMetadata,
      customMetadata: {
        ...(existing.customMetadata || {}),
        filename,
        uploadedAt:
          existing.customMetadata?.uploadedAt || existing.uploaded.toISOString(),
      },
    });

    return json({ ok: true, message: "Media renamed.", filename });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to rename the image." }, 500);
  }
}

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

    const key = readKey(context);
    if (!key) {
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

function readKey(context) {
  return decodeMediaReference(context.params.key);
}

function cleanFilename(value) {
  return String(value || "image")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "image";
}

function buildFilename(value, extension) {
  const cleaned = cleanFilename(value)
    .replace(/\.(jpe?g|png|webp|gif|avif)$/i, "")
    .replace(/\.+$/g, "")
    .trim();
  const maximumBaseLength = 120 - extension.length - 1;
  return `${(cleaned || "image").slice(0, maximumBaseLength)}.${extension}`;
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
