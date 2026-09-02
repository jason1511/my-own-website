import { requireAdmin } from "../../../../lib/admin-auth.js";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
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
      limit: 100,
      include: ["httpMetadata", "customMetadata"],
    });

    const assets = listed.objects
      .sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime())
      .map((object) => ({
        key: object.key,
        filename: object.customMetadata?.filename || object.key,
        alt_text: object.customMetadata?.altText || "",
        content_type: object.httpMetadata?.contentType || "application/octet-stream",
        size_bytes: object.size,
        uploaded_at: object.uploaded.toISOString(),
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
      return json({ ok: false, error: "Images must be 10 MB or smaller." }, 413);
    }

    const originalName = cleanFilename(file.name || `image.${extension}`);
    const key = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const object = await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        filename: originalName,
        altText,
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
          filename: originalName,
          alt_text: altText,
          content_type: file.type,
          size_bytes: file.size,
          uploaded_at: object.uploaded.toISOString(),
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

function mediaUrl(key) {
  return `/media/${encodeURIComponent(key)}`;
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
