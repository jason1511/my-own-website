import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  requireAdmin,
} from "../../../lib/admin-auth.js";

export async function onRequestGet(context) {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  return json({
    ok: true,
    authenticated: true,
    expires_after: "8 hours",
  });
}

export async function onRequestPost(context) {
  try {
    const expectedPassword = String(context.env.ADMIN_PASSWORD || "");

    if (!expectedPassword) {
      return json(
        { ok: false, error: "Admin password is not configured." },
        500
      );
    }

    const data = await context.request.json();
    const password = String(data.password || "");

    if (!password || password !== expectedPassword) {
      return json({ ok: false, error: "Invalid password." }, 401);
    }

    const cookie = await createAdminSessionCookie(expectedPassword);

    return json(
      { ok: true, message: "Admin unlocked for 8 hours." },
      200,
      { "Set-Cookie": cookie }
    );
  } catch (error) {
    console.error(error);
    return json(
      { ok: false, error: "Failed to verify admin password." },
      500
    );
  }
}

export async function onRequestDelete() {
  return json(
    { ok: true, message: "Admin session ended." },
    200,
    { "Set-Cookie": clearAdminSessionCookie() }
  );
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}
