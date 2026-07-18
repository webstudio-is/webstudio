export const sha256 = async (value: string | Uint8Array) => {
  const bytes = new Uint8Array(
    typeof value === "string" ? new TextEncoder().encode(value) : value
  );
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
};
