export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const slug = String(context.params.slug || "").trim().toLowerCase();

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return json(
        {
          ok: false,
          error: "Invalid project slug",
        },
        400
      );
    }

    const project = await db
      .prepare(
        `
        SELECT
          id,
          title,
          slug,
          summary,
          body,
          type,
          tech_stack,
          github_url,
          live_url,
          image_key,
          is_featured,
          display_order,
          created_at,
          updated_at
        FROM projects
        WHERE slug = ?
          AND is_published = 1
        LIMIT 1
        `
      )
      .bind(slug)
      .first();

    if (!project) {
      return json(
        {
          ok: false,
          error: "Project not found",
        },
        404
      );
    }

    return json({
      ok: true,
      project,
    });
  } catch (error) {
    console.error("Failed to load project:", error);

    return json(
      {
        ok: false,
        error: "Failed to load project",
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