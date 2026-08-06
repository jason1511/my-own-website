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
        excerpt,
        content,
        cover_image_key,
        is_published,
        display_order,
        created_at,
        updated_at
      FROM blog_posts
      ORDER BY display_order ASC, created_at DESC
      `
    ).all();

    return json({ ok: true, blog_posts: results });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Failed to load admin blog posts." }, 500);
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
    const excerpt = String(data.excerpt || "").trim();
    const content = String(data.content || "").trim();
    const coverImageKey = String(data.cover_image_key || "").trim();
    const isPublished = data.is_published ? 1 : 0;
    const displayOrder = Number.isFinite(Number(data.display_order))
      ? Number(data.display_order)
      : 0;

    if (!title || !excerpt || !content) {
      return json(
        {
          ok: false,
          error: "Title, excerpt, and content are required.",
        },
        400
      );
    }

    const slug = await createUniqueSlug(db, requestedSlug || title);

    const result = await db
      .prepare(
        `
        INSERT INTO blog_posts (
          title,
          slug,
          excerpt,
          content,
          cover_image_key,
          is_published,
          display_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        title,
        slug,
        excerpt,
        content,
        coverImageKey,
        isPublished,
        displayOrder
      )
      .run();

    return json({
      ok: true,
      message: "Blog post created.",
      slug,
      result,
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to create blog post.",
        detail: String(error.message || error),
      },
      500
    );
  }
}

async function createUniqueSlug(db, value) {
  const baseSlug = slugify(value) || "blog-post";
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
      FROM blog_posts
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
