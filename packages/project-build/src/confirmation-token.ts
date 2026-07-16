const encodeDigest = (digest: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const stringifyCanonicalJson = (value: unknown) =>
  JSON.stringify(value, (_key, child: unknown) => {
    if (child === null || Array.isArray(child) || typeof child !== "object") {
      return child;
    }
    return Object.fromEntries(
      Object.entries(child).sort(([left], [right]) => left.localeCompare(right))
    );
  });

const getConfirmationDigest = async (payload: unknown, expiresAt: number) =>
  encodeDigest(
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `${expiresAt}:${stringifyCanonicalJson(payload)}`
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
