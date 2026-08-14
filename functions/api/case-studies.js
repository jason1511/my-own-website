export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      `
      SELECT
        cs.id,
        cs.project_id,
        p.title AS project_title,
        p.slug AS project_slug,
        cs.title,
        cs.slug,
        cs.summary,
        cs.tech_stack,
        cs.github_url,
        cs.live_url,
        cs.image_key,
        cs.cover_image_alt,
        cs.role,
        cs.project_type,
        cs.project_status,
        cs.is_featured,
        cs.display_order,
        cs.created_at,
        cs.updated_at
      FROM case_studies AS cs
      LEFT JOIN projects AS p
        ON p.id = cs.project_id
      WHERE cs.is_published = 1
      ORDER BY cs.display_order ASC, cs.created_at DESC
      `
    ).all();

    return json({
      ok: true,
      case_studies: results,
    });
  } catch (error) {
    console.error("Failed to load case studies:", error);

    return json(
      {
        ok: false,
        error: "Failed to load case studies",
      },
      500
    );
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200
        ? "public, max-age=60"
        : "no-store",
    },
  });
}
