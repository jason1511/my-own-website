export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get("content-type") || "";

    let name = "";
    let email = "";
    let message = "";
    let botField = "";

    if (contentType.includes("application/json")) {
      const data = await context.request.json();
      name = (data.name || "").trim();
      email = (data.email || "").trim();
      message = (data.message || "").trim();
      botField = (data["bot-field"] || "").trim();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await context.request.formData();
      name = String(form.get("name") || "").trim();
      email = String(form.get("email") || "").trim();
      message = String(form.get("message") || "").trim();
      botField = String(form.get("bot-field") || "").trim();
    } else {
      return json({ error: "Unsupported content type" }, 400);
    }

    // Honeypot: silently accept spam-like submissions
    if (botField) {
      return json({ ok: true }, 200);
    }

    if (!name || !email || !message) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Basic email sanity check
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return json({ error: "Invalid email address" }, 400);
    }

    const resendApiKey = context.env.RESEND_API_KEY;
    const toEmail = context.env.CONTACT_TO_EMAIL;
    const fromEmail =
      context.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";

    if (!resendApiKey || !toEmail) {
      return json({ error: "Email service not configured" }, 500);
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `Portfolio contact from ${name}`,
        reply_to: email,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return json({ error: "Failed to send email" }, 502);
    }

    return json({ ok: true }, 200);
  } catch (error) {
    console.error(error);
    return json({ error: "Server error" }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}