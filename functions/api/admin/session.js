export async function onRequestPost(context) {
  try {
    const expectedPassword = context.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
      return json(
        {
          ok: false,
          error: "Admin password is not configured.",
        },
        500
      );
    }

    const data = await context.request.json();
    const password = String(data.password || "");

    if (!password || password !== expectedPassword) {
      return json(
        {
          ok: false,
          error: "Invalid password.",
        },
        401
      );
    }

    return json({
      ok: true,
      message: "Admin unlocked.",
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        error: "Failed to verify admin password.",
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
      "Cache-Control": "no-store",
    },
  });
}
