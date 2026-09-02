export async function onRequestGet(context) {
  try {
    if (!context.env.MEDIA_BUCKET) {
      return new Response("Media storage is not configured.", { status: 503 });
    }

    const key = String(context.params.key || "").trim();
    if (!key || key.includes("/") || key.includes("\\")) {
      return new Response("Invalid media key.", { status: 400 });
    }

    const object = await context.env.MEDIA_BUCKET.get(key);
    if (!object) return new Response("Image not found.", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error(error);
    return new Response("Unable to load image.", { status: 500 });
  }
}
