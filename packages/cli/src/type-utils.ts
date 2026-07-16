export const isPlainRecord = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

export const boundedIdentifierPattern = /^[A-Za-z0-9._:/-]{1,128}$/;
