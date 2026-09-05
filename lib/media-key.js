const TOKEN_PREFIX = "~";

export function mediaReference(key) {
  const value = String(key || "").trim();
  if (!value.includes("/")) return encodeURIComponent(value);

  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return `${TOKEN_PREFIX}${btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;
}

export function decodeMediaReference(reference) {
  const value = String(reference || "").trim();
  if (!value) return "";

  let decoded = value;
  try {
    if (value.startsWith(TOKEN_PREFIX)) {
      const encoded = value.slice(TOKEN_PREFIX.length)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
      const binary = atob(padded);
      decoded = new TextDecoder().decode(
        Uint8Array.from(binary, (character) => character.charCodeAt(0))
      );
    } else {
      decoded = decodeURIComponent(value);
    }
  } catch {
    return "";
  }

  return isSafeMediaKey(decoded) ? decoded : "";
}

export function isSafeMediaKey(key) {
  const value = String(key || "").trim();
  if (!value || value.length > 1024 || value.includes("\\") || value.includes("\0")) {
    return false;
  }

  return !value.split("/").some((segment) => !segment || segment === "." || segment === "..");
}
