export type ContentHash = `sha256:${string}`;

export const sha256Hex = async (value: string | Uint8Array) => {
  const bytes = new Uint8Array(
    typeof value === "string" ? new TextEncoder().encode(value) : value
  );
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const sha256 = async (
  value: string | Uint8Array
): Promise<ContentHash> => `sha256:${await sha256Hex(value)}`;

export const isContentHash = (value: unknown): value is ContentHash =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
