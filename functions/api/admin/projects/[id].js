import { requireAdmin } from "../../../../lib/admin-auth.js";

export async function onRequestPut(context) {
  try {
    const authError = await requireAdmin(context);
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
    const requestedSlug = String(data.slug || "").trim();
    const summary = String(data.summary || "").trim();
    const body = String(data.body || "").trim();
    const type = String(data.type || "project").trim();
    const techStack = String(data.tech_stack || "").trim();
    const githubUrl = String(data.github_url || "").trim();
    const liveUrl = String(data.live_url || "").trim();
    const imageKey = String(data.image_key || "").trim();
    const screenshots = normalizeScreenshots(data.screenshots);
    const screenshotsJson = JSON.stringify(screenshots);
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
        SELECT id, slug
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

    const slug = await createUniqueSlug(
      db,
      requestedSlug || existing.slug || title,
      id
    );

    try {
      await db.prepare(
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
          screenshots = ?,
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
        screenshotsJson,
        isFeatured,
        isPublished,
        displayOrder,
        id
      )
      .run();
    } catch (error) {
      if (!isMissingScreenshotsColumn(error)) throw error;
      if (screenshots.length) return migrationRequired();

      await db.prepare(
        `
        UPDATE projects
        SET title = ?, slug = ?, summary = ?, body = ?, type = ?,
            tech_stack = ?, github_url = ?, live_url = ?, image_key = ?,
            is_featured = ?, is_published = ?, display_order = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      ).bind(
        title, slug, summary, body, type, techStack, githubUrl, liveUrl,
        imageKey, isFeatured, isPublished, displayOrder, id
      ).run();
    }

    const updatedProject = await loadProjectById(db, id);

    return json({
      ok: true,
      message: "Project updated.",
      slug,
      project: parseProject(updatedProject),
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

async function loadProjectById(db, id) {
  const select = (includeScreenshots) => db.prepare(
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
          ${includeScreenshots ? "screenshots," : ""}
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
      .bind(id).first();

  try {
    return await select(true);
  } catch (error) {
    if (!isMissingScreenshotsColumn(error)) throw error;
    return select(false);
  }
}

export async function onRequestDelete(context) {
  try {
    const authError = await requireAdmin(context);
    if (authError) return authError;

    const db = context.env.DB;
    const id = Number(context.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json({ ok: false, error: "Invalid project ID." }, 400);
    }

    const existing = await db
      .prepare("SELECT id, title FROM projects WHERE id = ? LIMIT 1")
      .bind(id)
      .first();

    if (!existing) {
      return json({ ok: false, error: "Project not found." }, 404);
    }

    await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

    return json({ ok: true, message: "Project deleted.", project: existing });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to delete project." }, 500);
  }
}

function normalizeScreenshots(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((item) => ({
    image_url: String(item?.image_url || item?.url || "").trim().slice(0, 2048),
    image_alt: String(item?.image_alt || item?.alt || "").trim().slice(0, 300),
    image_caption: String(item?.image_caption || item?.caption || "").trim().slice(0, 500),
  })).filter((item) => item.image_url);
}

function parseProject(project) {
  return { ...project, screenshots: parseJsonArray(project?.screenshots) };
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isMissingScreenshotsColumn(error) {
  return /no such column:\s*screenshots/i.test(String(error?.message || error));
}

function migrationRequired() {
  return json({
    ok: false,
    code: "PROJECT_GALLERY_MIGRATION_REQUIRED",
    error: "Project galleries need migration 0003_add_project_gallery.sql applied to D1.",
  }, 409);
}

async function createUniqueSlug(db, value, currentProjectId) {
  const baseSlug = slugify(value) || "project";
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
