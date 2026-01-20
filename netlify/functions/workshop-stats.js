export async function handler(event) {
  try {
    const idsParam = event.queryStringParameters?.ids || "";
    const ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);

    if (ids.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing ids query parameter" }),
      };
    }

    const body = new URLSearchParams();
    body.set("itemcount", String(ids.length));
    ids.forEach((id, i) => body.set(`publishedfileids[${i}]`, id));
    body.set("format", "json");

    const res = await fetch(
      "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v0001/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }
    );

    const data = await res.json();
    const details = data?.response?.publishedfiledetails || [];

    const out = {};
    for (const d of details) {
      out[d.publishedfileid] = {
        subscriptions: toNum(d.subscriptions),
        favorited: toNum(d.favorited),
        views: toNum(d.views),
        title: d.title ?? null,
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900" },
      body: JSON.stringify(out),
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
