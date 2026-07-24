const graphqlName = /^[_A-Za-z][_0-9A-Za-z]*$/;
const encodedFieldPrefix = "_ws_";
const reservedFieldNames = new Set(["_raw", "exists"]);
const textEncoder = new TextEncoder();

const encodeHex = (value: string) =>
  Array.from(textEncoder.encode(value), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

/**
 * Keeps ordinary GraphQL names readable and maps every other JSON key to an
 * injective GraphQL-safe name. The prefix is reserved and encoded itself, so
 * a user key can never collide with another key or with Webstudio's `_raw`
 * escape hatch. This mapping is independent of neighboring fields and keeps
 * saved operations stable as a schemaless catalog evolves.
 */
export const encodeAssetGraphqlFieldName = (name: string) =>
  graphqlName.test(name) &&
  name.startsWith("__") === false &&
  name.startsWith(encodedFieldPrefix) === false &&
  reservedFieldNames.has(name) === false
    ? name
    : `${encodedFieldPrefix}${encodeHex(name)}`;

export const decodeAssetGraphqlFieldName = (name: string) => {
  if (name.startsWith(encodedFieldPrefix) === false) {
    return name;
  }
  const hex = name.slice(encodedFieldPrefix.length);
  if (hex.length % 2 !== 0 || /^[0-9a-f]*$/.test(hex) === false) {
    throw new Error("Encoded asset GraphQL field name is invalid");
  }
  const bytes = new Uint8Array(
    Array.from({ length: hex.length / 2 }, (_, index) =>
      Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
    )
  );
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Encoded asset GraphQL field name is invalid");
  }
};
