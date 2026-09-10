import { normalizeModDownload } from "./hobby-media.js";

export function filenameFromUrl(url) {
  try { return decodeURIComponent(String(url).split("/").pop()).replace(/^[a-f0-9-]{36}-/i, ""); }
  catch { return "Archive"; }
}
export function normalizeHobbyFiles(value) {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Attach up to 100 files per hobby project.");
  const seen = new Set();
  return value.map(file => {
    const url = normalizeModDownload(file?.url);
    if (!url) throw new Error("Each file must have an uploaded archive URL.");
    if (seen.has(url)) throw new Error("This archive is already attached. Upload a new file for a new version.");
    seen.add(url);
    const released = String(file.released_at || "").trim();
    if (released && (!/^\d{4}-\d{2}-\d{2}$/.test(released) || !Number.isFinite(Date.parse(released)) || new Date(released).toISOString().slice(0, 10) !== released)) throw new Error("Use a valid release date.");
    const size = Number(file.size || 0);
    return { url, filename: String(file.filename || filenameFromUrl(url)).trim().slice(0, 180), size: Number.isSafeInteger(size) && size >= 0 ? size : 0,
      version: String(file.version || "").trim().slice(0, 64), released_at: released, notes: String(file.notes || "").trim().slice(0, 2000) };
  });
}
export function hobbyFiles(item) {
  const raw = item.files;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try { const files = JSON.parse(raw); if (Array.isArray(files)) return files; } catch { /* Legacy records use the single attachment. */ }
  }
  return item.download_url ? [{ url: item.download_url, filename: filenameFromUrl(item.download_url), size: 0, version: "", released_at: "", notes: "" }] : [];
}
export async function withHobbyFiles(item, bucket) {
  const files = hobbyFiles(item);
  return { ...item, files: await Promise.all(files.map(async file => {
    if (file.size || !bucket || !file.url?.startsWith("/downloads/")) return file;
    try {
      const object = await bucket.head(`mods/${decodeURIComponent(file.url.slice(11))}`);
      return object ? { ...file, filename: object.customMetadata?.filename || file.filename, size: object.size } : file;
    } catch { return file; }
  })) };
}
