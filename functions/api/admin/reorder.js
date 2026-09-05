import { requireAdmin } from "../../../lib/admin-auth.js";

const COLLECTIONS = {
  projects: "projects",
  "case-studies": "case_studies",
  blog: "blog_posts",
  workshop: "workshop_items",
};

export async function onRequestPost(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const data = await context.request.json().catch(() => null);
    const collection = String(data?.collection || "");
    const table = COLLECTIONS[collection];
    const ids = Array.isArray(data?.ids) ? data.ids.map(Number) : [];

    if (!table || !isValidIdList(ids)) {
      return json({ ok: false, error: "Invalid reorder request." }, 400);
    }

    const { results } = await context.env.DB.prepare(
      `SELECT id FROM ${table} ORDER BY id ASC`
    ).all();
    const storedIds = results.map((row) => Number(row.id)).sort((a, b) => a - b);
    const submittedIds = [...ids].sort((a, b) => a - b);

    if (
      storedIds.length !== submittedIds.length ||
      storedIds.some((id, index) => id !== submittedIds[index])
    ) {
      return json(
        { ok: false, error: "The list changed. Refresh it and try again." },
        409
      );
    }

    await context.env.DB.batch(
      ids.map((id, index) =>
        context.env.DB.prepare(
          `UPDATE ${table} SET display_order = ? WHERE id = ?`
        ).bind(index, id)
      )
    );

    return json({ ok: true, message: "Order saved.", ids });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to save the new order." }, 500);
  }
}

function isValidIdList(ids) {
  return (
    ids.length <= 1000 &&
    ids.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(ids).size === ids.length
  );
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
