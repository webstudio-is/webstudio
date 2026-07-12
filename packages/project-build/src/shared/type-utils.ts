export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isPlainRecord = (
  value: unknown
): value is Record<string, unknown> =>
  isRecord(value) && Array.isArray(value) === false;
