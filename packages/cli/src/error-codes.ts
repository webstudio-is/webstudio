import { getApiErrorCode } from "@webstudio-is/http-client";

export const getStableErrorCode = (error: unknown) => {
  const apiErrorCode = getApiErrorCode(error);
  if (apiErrorCode !== undefined) {
    return apiErrorCode;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
};
