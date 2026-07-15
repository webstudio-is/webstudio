const publicApiRemoteErrorCodes = [
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "INVALID_INPUT",
  "NOT_FOUND",
  "PROJECT_NOT_PUBLISHED",
  "UNAUTHORIZED",
] as const;

export type PublicApiRemoteErrorCode =
  (typeof publicApiRemoteErrorCodes)[number];

const publicApiRemoteErrorCodeSet = new Set<string>(publicApiRemoteErrorCodes);

export const isPublicApiRemoteErrorCode = (
  code: string
): code is PublicApiRemoteErrorCode => publicApiRemoteErrorCodeSet.has(code);
