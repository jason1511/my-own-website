export function normalizeDependencies(value) {
  if (!Array.isArray(value) || value.length > 30) throw new Error("Use up to 30 dependencies.");
  return value.map(entry => {
    const name = String(entry?.name || "").trim();
    const raw = String(entry?.url || "").trim();
    let url;
    try { url = new URL(raw); } catch { throw new Error("Each dependency needs a complete HTTP/HTTPS link."); }
    if (!name || name.length > 180) throw new Error("Each dependency needs a name of up to 180 characters.");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || raw.length > 2048) throw new Error("Use an HTTP/HTTPS dependency link without credentials.");
    return { name, url: url.href };
  });
}
export function hobbyDependencies(item) {
  if (Array.isArray(item.dependencies)) return item.dependencies;
  if (typeof item.dependencies === "string" && item.dependencies.trim()) {
    try { const entries = JSON.parse(item.dependencies); if (Array.isArray(entries)) return entries; } catch { /* Older descriptions may contain dependency links. */ }
  }
  // Recognize explicitly labelled legacy dependencies, not arbitrary description links.
  const entries = [];
  for (const line of String(item.body || "").split(/\r?\n/)) {
    const match = line.match(/^\s*(mod asli)\s*:\s*(https?:\/\/\S+)\s*$/i);
    if (match) { try { entries.push(...normalizeDependencies([{ name: "Mod asli", url: match[2] }])); } catch {} }
  }
  return entries.slice(0, 30);
}
