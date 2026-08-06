export async function onRequestGet(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const { results } = await context.env.DB.prepare(
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
      ORDER BY display_order ASC, created_at DESC
      `
    ).all();

    return json({ ok: true, projects: results });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to load admin projects." }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const authError = checkAdminPassword(context);
    if (authError) return authError;

    const db = context.env.DB;
    const data = await context.request.json();

    const title = String(data.title || "").trim();
    const requestedSlug = String(data.slug || "").trim();
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

    const slug = await createUniqueSlug(db, requestedSlug || title);

    const result = await db
      .prepare(
        `
        INSERT INTO projects (
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
          display_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        displayOrder
      )
      .run();

    return json({
      ok: true,
      message: "Project created.",
      slug,
      result,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to create project.",
        detail: String(error.message || error),
      },
      500
    );
  }
}

async function createUniqueSlug(db, value) {
  const baseSlug = slugify(value) || "project";
  let slug = baseSlug;
  let counter = 2;

  while (await slugExists(db, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function slugExists(db, slug) {
  const existing = await db
    .prepare(
      `
      SELECT id
      FROM projects
      WHERE slug = ?
      LIMIT 1
      `
    )
    .bind(slug)
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
      "Cache-Control": "no-store",
    },
  });
}
