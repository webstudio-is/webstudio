const encodeDigest = (digest: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)])
  );
};

const getConfirmationDigest = async (payload: unknown, expiresAt: number) =>
  encodeDigest(
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `${expiresAt}:${JSON.stringify(canonicalize(payload))}`
      )
    )
  );

export const createConfirmationToken = async (
  payload: unknown,
  ttlMs: number
) => {
  const expiresAt = Date.now() + ttlMs;
  const digest = await getConfirmationDigest(payload, expiresAt);
  return { token: `${expiresAt.toString(36)}.${digest}`, expiresAt };
};

export const validateConfirmationToken = async (
  token: string | undefined,
  payload: unknown
) => {
  if (token === undefined) {
    return false;
  }
  const [encodedExpiresAt, digest, ...extra] = token.split(".");
  if (
    encodedExpiresAt === undefined ||
    digest === undefined ||
    extra.length > 0
  ) {
    return false;
  }
  const expiresAt = Number.parseInt(encodedExpiresAt, 36);
  if (Number.isSafeInteger(expiresAt) === false || expiresAt < Date.now()) {
    return false;
  }
  return digest === (await getConfirmationDigest(payload, expiresAt));
};
