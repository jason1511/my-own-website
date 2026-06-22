export async function onRequestPut(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json(
        {
          ok: false,
          error: "Invalid project ID.",
        },
        400
      );
    }

    const data = await context.request.json();

    const title = String(data.title || "").trim();
    const summary = String(data.summary || "").trim();
    const body = String(data.body || "").trim();
    const type = String(data.type || "project").trim();
    const techStack = String(data.tech_stack || "").trim();
    const githubUrl = String(data.github_url || "").trim();
    const liveUrl = String(data.live_url || "").trim();
    const imageKey = String(data.image_key || "").trim();
    const isFeatured = data.is_featured ? 1 : 0;
    const isPublished = data.is_published ? 1 : 0;
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;

    if (!title || !summary) {
      return json(
        {
          ok: false,
          error: "Title and summary are required.",
        },
        400
      );
    }

    const existing = await db
      .prepare(
        `
        SELECT id
        FROM projects
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
          error: "Project not found.",
        },
        404
      );
    }

    const slug = await createUniqueSlug(db, title, id);

    await db
      .prepare(
        `
        UPDATE projects
        SET
          title = ?,
          slug = ?,
          summary = ?,
          body = ?,
          type = ?,
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
        title,
        slug,
        summary,
        body,
        type,
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

    const updatedProject = await db
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
          is_published,
          display_order,
          created_at,
          updated_at
        FROM projects
        WHERE id = ?
        LIMIT 1
        `
      )
      .bind(id)
      .first();

    return json({
      ok: true,
      message: "Project updated.",
      slug,
      project: updatedProject,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to update project.",
        detail: String(error.message || error),
      },
      500
    );
  }
}

async function createUniqueSlug(db, title, currentProjectId) {
  const baseSlug = slugify(title) || "project";
  let slug = baseSlug;
  let counter = 2;

  while (await slugExists(db, slug, currentProjectId)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function slugExists(db, slug, currentProjectId) {
  const existing = await db
    .prepare(
      `
      SELECT id
      FROM projects
      WHERE slug = ?
        AND id != ?
      LIMIT 1
      `
    )
    .bind(slug, currentProjectId)
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
  const providedPassword = context.request.headers.get("x-admin-password");

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
    },
  });
}