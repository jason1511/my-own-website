export async function onRequestGet({ env, params }) {
  const headers = { "Cache-Control": "no-store" };
  const id = String(params.id || "");
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return Response.json({ ok: false, error: "Hobby project not found." }, { status: 404, headers });
  }
  try {
    const item = await env.DB.prepare("SELECT * FROM workshop_items WHERE id = ? AND is_published = 1 LIMIT 1").bind(Number(id)).first();
    if (!item) return Response.json({ ok: false, error: "Hobby project not found." }, { status: 404, headers });
    return Response.json({ ok: true, workshop_item: item }, { headers });
  } catch (error) {
    console.error("Hobby detail failed", error);
    return Response.json({ ok: false, error: "Unable to load this hobby project." }, { status: 500, headers });
  }
}
