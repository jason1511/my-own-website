import { hobbyFiles } from "../../../../lib/hobby-files.js";
import { requireAdmin } from "../../../../lib/admin-auth.js";

export const CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_SIZE = 256 * 1024 * 1024;
const extensions = /\.(zip|rar|7z|scs|pak|tar|gz)$/i;
const encoder = new TextEncoder();
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const keyFor = secret => crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function sign(claims, secret) {
  const payload = btoa(JSON.stringify(claims));
  const signature = await crypto.subtle.sign("HMAC", await keyFor(secret), encoder.encode(payload));
  return `${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
}
async function verify(token, secret) {
  try {
    if (!token || token.length > 4096) throw 0;
    const [payload, signature, extra] = token.split(".");
    if (extra || !await crypto.subtle.verify("HMAC", await keyFor(secret), bytes(signature), encoder.encode(payload))) throw 0;
    const claims = JSON.parse(atob(payload));
    if (claims.exp < Date.now() || !claims.key.startsWith("mods/")) throw 0;
    return claims;
  } catch { throw fail("Upload expired or invalid. Start the upload again.", 403); }
}
async function readPart(request, expected) {
  if (!request.body) throw fail("Missing file chunk.");
  const reader = request.body.getReader();
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > expected) { await reader.cancel(); throw fail("File chunk is too large.", 413); }
    chunks.push(value);
  }
  if (length !== expected) throw fail("Incomplete file chunk. Retry the upload.");
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
export async function onRequest(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;
    const { request, env } = context;
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) throw fail("Invalid request origin.", 403);
    const bucket = env.MEDIA_BUCKET;
    if (!bucket) throw fail("Media storage is not configured.", 503);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (request.method === "GET" && action === "list") {
      const result = await bucket.list({ prefix: "mods/", limit: 1000, include: ["customMetadata"] });
      return json({ ok: true, truncated: result.truncated, files: result.objects.map(o => ({ key: o.key, filename: o.customMetadata?.filename || o.key.slice(5), size: o.size, url: `/downloads/${encodeURIComponent(o.key.slice(5))}` })) });
    }
    if (request.method === "DELETE" && action === "file") {
      const key = url.searchParams.get("key") || "";
      if (!/^mods\/[a-f0-9-]{36}-[a-zA-Z0-9._-]+\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(key)) throw fail("Invalid archive.");
      const download = `/downloads/${encodeURIComponent(key.slice(5))}`;
      // Check both new attachment fields and older pasted project links.
      const { results } = await env.DB.prepare("SELECT * FROM workshop_items").all();
      if (results.some(item => {
        if (item.download_url === download || hobbyFiles(item).some(file => file.url === download)) return true;
        try { return new URL(item.workshop_url).pathname === download; } catch { return false; }
      })) throw fail("This file is attached to a saved hobby project. Remove its attachment and save that project first.", 409);
      await bucket.delete(key);
      return json({ ok: true });
    }
    if (request.method === "POST" && action === "start") {
      const data = await request.json();
      const filename = String(data.filename || "").replace(/[^a-zA-Z0-9._ -]/g, "-").slice(-150);
      const size = Number(data.size);
      if (!extensions.test(filename)) throw fail("Use ZIP, RAR, 7Z, SCS, PAK, TAR, or GZ files.");
      if (!Number.isSafeInteger(size) || size < 1 || size > MAX_SIZE) throw fail("Files must be between 1 byte and 256 MB.");
      const key = `mods/${crypto.randomUUID()}-${filename.replace(/ /g, "-")}`;
      const upload = await bucket.createMultipartUpload(key, {
        httpMetadata: { contentType: "application/octet-stream", contentDisposition: `attachment; filename="${filename}"`, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { filename, size: String(size), uploadedAt: new Date().toISOString() }
      });
      const token = await sign({ key, uploadId: upload.uploadId, size, exp: Date.now() + 4 * 60 * 60 * 1000 }, env.ADMIN_PASSWORD);
      return json({ ok: true, token, chunk_size: CHUNK_SIZE });
    }
    const claims = await verify(request.headers.get("X-Upload-Token"), env.ADMIN_PASSWORD);
    const upload = bucket.resumeMultipartUpload(claims.key, claims.uploadId);
    if (request.method === "PUT" && action === "part") {
      const partNumber = Number(url.searchParams.get("part"));
      const count = Math.ceil(claims.size / CHUNK_SIZE);
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > count) throw fail("Invalid chunk number.");
      const expected = Math.min(CHUNK_SIZE, claims.size - (partNumber - 1) * CHUNK_SIZE);
      const body = await readPart(request, expected);
      const part = await upload.uploadPart(partNumber, body);
      return json({ ok: true, part });
    }
    if (request.method === "POST" && action === "complete") {
      const { parts } = await request.json();
      const count = Math.ceil(claims.size / CHUNK_SIZE);
      if (!Array.isArray(parts) || parts.length !== count || parts.some((p, i) => p.partNumber !== i + 1 || typeof p.etag !== "string" || p.etag.length > 200)) throw fail("Missing or invalid file chunks.");
      // A completion response can be lost; return the existing object on retry.
      let object = await bucket.head(claims.key);
      if (!object) object = await upload.complete(parts);
      if (object.size !== claims.size) { await bucket.delete(claims.key); throw fail("Uploaded file size did not match. Please upload again."); }
      return json({ ok: true, url: `/downloads/${encodeURIComponent(claims.key.slice(5))}`, filename: object.customMetadata?.filename, size: object.size });
    }
    if (request.method === "DELETE" && action === "abort") {
      await upload.abort();
      return json({ ok: true });
    }
    return json({ ok: false, error: "Unsupported upload action." }, 405);
  } catch (error) {
    console.error("Mod upload failed", error.message);
    return json({ ok: false, error: error.status ? error.message : "Upload failed. Please retry." }, error.status || 500);
  }
}
