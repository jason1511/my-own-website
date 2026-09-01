const COOKIE_NAME = "__Host-portfolio_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

export async function requireAdmin(context) {
  const secret = String(context.env.ADMIN_PASSWORD || "");

  if (!secret) {
    return json({ ok: false, error: "Admin password is not configured." }, 500);
  }

  const token = readCookie(context.request, COOKIE_NAME);
  const session = token ? await verifyToken(token, secret) : null;

  if (!session) {
    return json(
      { ok: false, error: "Admin session is missing or expired." },
      401
    );
  }

  return null;
}

export async function createAdminSessionCookie(secret) {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload = encodeBase64Url(
    encoder.encode(JSON.stringify({ version: 1, expires_at: expiresAt }))
  );
  const signature = await sign(payload, secret);
  const token = `${payload}.${signature}`;
  const expires = new Date(expiresAt).toUTCString();

  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    `Expires=${expires}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");
}

export function clearAdminSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");
}

async function verifyToken(token, secret) {
  try {
    if (token.length > 2048) return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      encoder.encode(payload)
    );

    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload))
    );

    if (
      data.version !== 1 ||
      !Number.isFinite(data.expires_at) ||
      data.expires_at <= Date.now()
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

async function sign(payload, secret) {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return encodeBase64Url(new Uint8Array(signature));
}

function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }

  return "";
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
