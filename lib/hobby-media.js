// Run only after admin authentication. Older deployments gain optional image fields
// on their next admin request; existing hobby records and links are preserved.
export async function ensureHobbyMedia(db) {
  const { results } = await db.prepare("PRAGMA table_info(workshop_items)").all();
  const columns = new Set(results.map((column) => column.name));
  for (const column of ["image_key", "image_alt", "screenshots", "download_url"]) {
    if (columns.has(column)) continue;
    try {
      await db.prepare(`ALTER TABLE workshop_items ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`).run();
    } catch (error) {
      // Another authenticated request may have added it concurrently.
      if (!/duplicate column name/i.test(String(error.message || error))) throw error;
    }
  }
}

export function normalizeHobbyImage(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (image.length > 2048) throw new Error("Image URL is too long.");
  const url = new URL(image, "https://portfolio.invalid");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || image.startsWith("//")) {
    throw new Error("Use a local image path or an HTTP/HTTPS image URL.");
  }
  return image;
}

export function normalizeHobbyGallery(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 30) throw new Error("Use up to 30 gallery images.");
  return value.map(item => ({
    image_url: normalizeHobbyImage(item?.image_url),
    image_alt: String(item?.image_alt || "").trim().slice(0, 300),
    image_caption: String(item?.image_caption || "").trim().slice(0, 1000)
  })).filter(item => item.image_url);
}
export function normalizeModDownload(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (!/^\/downloads\/[a-f0-9-]{36}-[a-zA-Z0-9._-]+\.(zip|rar|7z|scs|pak|tar|gz)$/i.test(url)) throw new Error("Choose an uploaded mod archive.");
  return url;
}
