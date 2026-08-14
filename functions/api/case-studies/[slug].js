export async function onRequestGet(context) {
  try {
    const slug = String(context.params.slug || "").trim().toLowerCase();

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return json(
        {
          ok: false,
          error: "Invalid case study slug",
        },
        400
      );
    }

    const caseStudy = await context.env.DB.prepare(
      `
      SELECT
        cs.id,
        cs.project_id,
        p.title AS project_title,
        p.slug AS project_slug,
        cs.title,
        cs.slug,
        cs.summary,
        cs.problem,
        cs.solution,
        cs.key_features,
        cs.technical_details,
        cs.challenges,
        cs.learnings,
        cs.tech_stack,
        cs.github_url,
        cs.live_url,
        cs.image_key,
        cs.is_featured,
        cs.display_order,
        cs.created_at,
        cs.updated_at
      FROM case_studies AS cs
      LEFT JOIN projects AS p
        ON p.id = cs.project_id
      WHERE cs.slug = ?
        AND cs.is_published = 1
      LIMIT 1
      `
    )
      .bind(slug)
      .first();

    if (!caseStudy) {
      return json(
        {
          ok: false,
          error: "Case study not found",
        },
        404
      );
    }

    return json({
      ok: true,
      case_study: caseStudy,
    });
  } catch (error) {
    console.error("Failed to load case study:", error);

    return json(
      {
        ok: false,
        error: "Failed to load case study",
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
