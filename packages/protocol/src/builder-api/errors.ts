const publicApiRemoteErrorCodes = [
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
] as const;

export type PublicApiRemoteErrorCode =
  (typeof publicApiRemoteErrorCodes)[number];

const publicApiRemoteErrorCodeSet = new Set<string>(publicApiRemoteErrorCodes);

export const isPublicApiRemoteErrorCode = (
  code: string
): code is PublicApiRemoteErrorCode => publicApiRemoteErrorCodeSet.has(code);
