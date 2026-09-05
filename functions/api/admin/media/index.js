import { requireAdmin } from "../../../../lib/admin-auth.js";
import { mediaReference } from "../../../../lib/media-key.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

export async function onRequestGet(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const bucket = getBucket(context);
    if (bucket instanceof Response) return bucket;

    const listed = await bucket.list({
      limit: 1000,
      include: ["httpMetadata", "customMetadata"],
    });

    const assets = listed.objects
      .sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime())
      .map((object) => ({
        key: object.key,
        reference: mediaReference(object.key),
        filename: object.customMetadata?.filename || object.key,
        alt_text: object.customMetadata?.altText || "",
        content_type: object.httpMetadata?.contentType || "application/octet-stream",
        size_bytes: object.size,
        uploaded_at:
          object.customMetadata?.uploadedAt || object.uploaded.toISOString(),
        url: mediaUrl(object.key),
      }));

    return json({ ok: true, assets, truncated: listed.truncated });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to load media assets." }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const bucket = getBucket(context);
    if (bucket instanceof Response) return bucket;

    const formData = await context.request.formData();
    const file = formData.get("file");
    const altText = String(formData.get("alt_text") || "").trim().slice(0, 300);
    const requestedName = String(formData.get("filename") || "").trim();

    if (!file || typeof file === "string") {
      return json({ ok: false, error: "Choose an image to upload." }, 400);
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type);
    if (!extension) {
      return json(
        { ok: false, error: "Use a JPG, PNG, WebP, GIF, or AVIF image." },
        415
      );
    }

    if (!file.size || file.size > MAX_IMAGE_SIZE) {
      return json({ ok: false, error: "Images must be 5 MB or smaller." }, 413);
    }

    const originalName = buildFilename(
      requestedName || file.name,
      extension,
      `image-${Date.now()}`
    );
    const key = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const uploadedAt = new Date().toISOString();
    const object = await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        filename: originalName,
        altText,
        uploadedAt,
      },
    });

    if (!object) {
      return json({ ok: false, error: "The image upload did not complete." }, 500);
    }

    return json(
      {
        ok: true,
        message: "Image uploaded.",
        asset: {
          key,
          reference: mediaReference(key),
          filename: originalName,
          alt_text: altText,
          content_type: file.type,
          size_bytes: file.size,
          uploaded_at: uploadedAt,
          url: mediaUrl(key),
        },
      },
      201
    );
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to upload the image." }, 500);
  }
}

function getBucket(context) {
  if (context.env.MEDIA_BUCKET) return context.env.MEDIA_BUCKET;

  return json(
    {
      ok: false,
      code: "R2_NOT_CONFIGURED",
      error: "R2 is not connected yet. Bind an R2 bucket as MEDIA_BUCKET, then redeploy.",
    },
    503
  );
}

function cleanFilename(value) {
  return String(value || "image")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "image";
}

function buildFilename(value, extension, fallback) {
  const cleaned = cleanFilename(value || fallback)
    .replace(/\.(jpe?g|png|webp|gif|avif)$/i, "")
    .replace(/\.+$/g, "")
    .trim();
  const maximumBaseLength = 120 - extension.length - 1;
  return `${(cleaned || fallback).slice(0, maximumBaseLength)}.${extension}`;
}

function mediaUrl(key) {
  return `/media/${mediaReference(key)}`;
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
