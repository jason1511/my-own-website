export async function onRequestPut(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = parseId(context.params.id);

    if (!id) {
      return json(
        {
          ok: false,
          error: "Invalid case study ID.",
        },
        400
      );
    }

    const existing = await db
      .prepare(
        `
        SELECT id, slug
        FROM case_studies
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    if (!existing) {
      return json(
        {
          ok: false,
          error: "Case study not found.",
        },
        404
      );
    }

    const data = await context.request.json();

    const projectId = parseOptionalProjectId(data.project_id);
    const title = String(data.title || "").trim();
    const requestedSlug = String(data.slug || "").trim();
    const summary = String(data.summary || "").trim();
    const problem = String(data.problem || "").trim();
    const solution = String(data.solution || "").trim();
    const keyFeatures = String(data.key_features || "").trim();
    const technicalDetails = String(
      data.technical_details || ""
    ).trim();
    const challenges = String(data.challenges || "").trim();
    const learnings = String(data.learnings || "").trim();
    const techStack = String(data.tech_stack || "").trim();
    const githubUrl = String(data.github_url || "").trim();
    const liveUrl = String(data.live_url || "").trim();
    const imageKey = String(data.image_key || "").trim();
    const isFeatured = data.is_featured ? 1 : 0;
    const isPublished = data.is_published ? 1 : 0;
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;

    if (projectId === false) {
      return json(
        {
          ok: false,
          error: "Project ID must be a positive whole number.",
        },
        400
      );
    }

    if (!title || !summary) {
      return json(
        {
          ok: false,
          error: "Title and summary are required.",
        },
        400
      );
    }

    if (isPublished && (!problem || !solution)) {
      return json(
        {
          ok: false,
          error:
            "Published case studies require both a problem and solution.",
        },
        400
      );
    }

    if (projectId !== null) {
      const project = await db
        .prepare(
          `
          SELECT id
          FROM projects
          WHERE id = ?
          LIMIT 1
          `
        )
        .bind(projectId)
        .first();

      if (!project) {
        return json(
          {
            ok: false,
            error: "The selected project does not exist.",
          },
          400
        );
      }
    }

    const slug = await createUniqueSlug(
      db,
      requestedSlug || existing.slug || title,
      id
    );

    await db
      .prepare(
        `
        UPDATE case_studies
        SET
          project_id = ?,
          title = ?,
          slug = ?,
          summary = ?,
          problem = ?,
          solution = ?,
          key_features = ?,
          technical_details = ?,
          challenges = ?,
          learnings = ?,
          tech_stack = ?,
          github_url = ?,
          live_url = ?,
          image_key = ?,
          is_featured = ?,
          is_published = ?,
          display_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
      .bind(
        projectId,
        title,
        slug,
        summary,
        problem,
        solution,
        keyFeatures,
        technicalDetails,
        challenges,
        learnings,
        techStack,
        githubUrl,
        liveUrl,
        imageKey,
        isFeatured,
        isPublished,
        displayOrder,
        id
      )
      .run();

    const updatedCaseStudy = await db
      .prepare(
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
          cs.is_published,
          cs.display_order,
          cs.created_at,
          cs.updated_at
        FROM case_studies AS cs
        LEFT JOIN projects AS p
          ON p.id = cs.project_id
        WHERE cs.id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    return json({
      ok: true,
      message: "Case study updated.",
      slug,
      case_study: updatedCaseStudy,
    });
  } catch (error) {
    console.error("Failed to update case study:", error);

    return json(
      {
        ok: false,
        error: "Failed to update case study.",
        detail: String(error.message || error),
      },
      500
    );
  }
}

export async function onRequestDelete(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = parseId(context.params.id);

    if (!id) {
      return json(
        {
          ok: false,
          error: "Invalid case study ID.",
        },
        400
      );
    }

    const existing = await db
      .prepare(
        `
        SELECT id, title
        FROM case_studies
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    if (!existing) {
      return json(
        {
          ok: false,
          error: "Case study not found.",
        },
        404
      );
    }

    await db
      .prepare(
        `
        DELETE FROM case_studies
        WHERE id = ?
        `
      )
      .bind(id)
      .run();

    return json({
      ok: true,
      message: "Case study deleted.",
      case_study: existing,
    });
  } catch (error) {
    console.error("Failed to delete case study:", error);

    return json(
      {
        ok: false,
        error: "Failed to delete case study.",
      },
      500
    );
  }
}

function parseId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseOptionalProjectId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const projectId = Number(value);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return false;
  }

  return projectId;
}

async function createUniqueSlug(
  db,
  value,
  currentCaseStudyId
) {
  const baseSlug = slugify(value) || "case-study";
  let slug = baseSlug;
  let counter = 2;

  while (
    await slugExists(db, slug, currentCaseStudyId)
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function slugExists(
  db,
  slug,
  currentCaseStudyId
) {
  const existing = await db
    .prepare(
      `
      SELECT id
      FROM case_studies
      WHERE slug = ?
        AND id != ?
      LIMIT 1
      `
    )
    .bind(slug, currentCaseStudyId)
    .first();

  return Boolean(existing);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function checkAdminPassword(context) {
  const expectedPassword = context.env.ADMIN_PASSWORD;
  const providedPassword = context.request.headers.get(
    "x-admin-password"
  );

  if (!expectedPassword) {
    return json(
      {
        ok: false,
        error: "Admin password is not configured.",
      },
      500
    );
  }

  if (!providedPassword || providedPassword !== expectedPassword) {
    return json(
      {
        ok: false,
        error: "Unauthorized.",
      },
      401
    );
  }

  return null;
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