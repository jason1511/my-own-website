const validKey = /^[a-f0-9-]{36}-[a-zA-Z0-9._-]+\.(zip|rar|7z|scs|pak|tar|gz)$/i;
export async function onRequest(context) {
  const { request, env } = context;
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const name = String(context.params.key || "");
  if (!validKey.test(name)) return new Response("File not found.", { status: 404 });
  if (!env.MEDIA_BUCKET) return new Response("Downloads unavailable.", { status: 503 });
  try {
    const key = `mods/${name}`;
    const metadata = await env.MEDIA_BUCKET.head(key);
    if (!metadata) return new Response("File not found.", { status: 404 });
    const headers = new Headers({ "Content-Type": "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes", ETag: metadata.httpEtag });
    const filename = String(metadata.customMetadata?.filename || name).replace(/[^a-zA-Z0-9._ -]/g, "-");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    if (request.headers.get("If-None-Match") === metadata.httpEtag) return new Response(null, { status: 304, headers });
    let range; let status = 200;
    const rangeHeader = request.headers.get("Range");
    const ifRange = request.headers.get("If-Range");
    if (request.method === "GET" && rangeHeader && (!ifRange || ifRange === metadata.httpEtag)) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      let start, end;
      if (match && (match[1] || match[2])) {
        start = match[1] ? Number(match[1]) : Math.max(0, metadata.size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), metadata.size - 1) : metadata.size - 1;
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= metadata.size) {
        headers.set("Content-Range", `bytes */${metadata.size}`);
        return new Response(null, { status: 416, headers });
      }
      range = { offset: start, length: end - start + 1 }; status = 206;
      headers.set("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
    }
    headers.set("Content-Length", String(range?.length ?? metadata.size));
    if (request.method === "HEAD") return new Response(null, { headers });
    const object = await env.MEDIA_BUCKET.get(key, range ? { range } : undefined);
    if (!object) return new Response("File not found.", { status: 404 });
    return new Response(object.body, { status, headers });
  } catch { return new Response("Unable to download this file.", { status: 500 }); }
}
