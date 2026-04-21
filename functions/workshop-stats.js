export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const idsParam = url.searchParams.get("ids") || "";

    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (ids.length === 0) {
      return json({ error: "Missing ids query parameter" }, 400);
    }

    const body = new URLSearchParams();
    body.set("itemcount", String(ids.length));
    ids.forEach((id, i) => body.set(`publishedfileids[${i}]`, id));
    body.set("format", "json");

    const res = await fetch(
      "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v0001/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!res.ok) {
      return json({ error: `Steam API error: ${res.status}` }, 502);
    }

    const data = await res.json();
    const details = data?.response?.publishedfiledetails || [];

    const out = {};
    for (const d of details) {
      out[d.publishedfileid] = {
        title: d.title ?? null,
        subscriptions: toNum(d.subscriptions),
        favorited: toNum(d.favorited),
        views: toNum(d.views),
      };
    }

    return json(out, 200, {
      "Cache-Control": "public, max-age=900",
    });
  } catch (error) {
    console.error(error);
    return json({ error: "Server error" }, 500);
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}