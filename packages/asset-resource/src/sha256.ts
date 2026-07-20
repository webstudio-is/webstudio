export const sha256Hex = async (value: string | Uint8Array) => {
  const bytes = new Uint8Array(
    typeof value === "string" ? new TextEncoder().encode(value) : value
  );
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const sha256 = async (value: string | Uint8Array) =>
  `sha256:${await sha256Hex(value)}`;
