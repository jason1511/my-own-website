// Keep the existing UNIQUE, NOT NULL steam_id column compatible with external entries.
// External keys are namespaced by URL; only numeric Steam IDs are used for statistics.
export function hobbyLinkIdentity(rawUrl, rawSteamId = "") {
  let url;
  try { url = new URL(String(rawUrl).trim()); } catch { throw new Error("Enter a valid project or download URL."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Use an HTTP or HTTPS link without embedded credentials.");
  }
  if (url.hostname === "steamcommunity.com" || url.hostname === "www.steamcommunity.com") {
    const supplied = String(rawSteamId || "").trim();
    const linked = url.searchParams.get("id") || "";
    const id = linked || supplied;
    if (!/^\d+$/.test(id)) throw new Error("Enter a Steam Workshop item URL containing its numeric ID.");
    if (supplied && supplied !== id) throw new Error("Steam ID must match the ID in the Workshop URL.");
    return id;
  }
  return `external:${url.href}`;
}
