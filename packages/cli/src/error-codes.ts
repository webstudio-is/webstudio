import {
  getApiCompatibilityMessage,
  getApiErrorCode,
} from "@webstudio-is/http-client";
import {
  formatValidationErrorMessage,
  getValidationIssues,
} from "@webstudio-is/project-build/runtime";

const missingProjectOwnerForTokenPattern =
  /^Project owner can't be found for token\b/;
const stableErrorCodePattern = /^[A-Z][A-Z0-9_]{0,159}$/;

const getErrorMessage = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : error instanceof Error
      ? error.message
      : String(error);

export const getStableErrorCode = (error: unknown) => {
  const directErrorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  const code = getApiErrorCode(error) ?? directErrorCode;
  return typeof code === "string" && stableErrorCodePattern.test(code)
    ? code
    : undefined;
};

export const isMissingApiAccessError = (error: unknown) => {
  const message = getErrorMessage(error);
  return missingProjectOwnerForTokenPattern.test(message);
};

export const getCliErrorSummary = (error: unknown, command = "mcp") => {
  const compatibilityMessage = getApiCompatibilityMessage(error, {
    updateCommand: "npm install -g webstudio@latest",
    runLatestCommand: `npx webstudio@latest ${command}`,
  });
  if (compatibilityMessage !== undefined) {
    return compatibilityMessage;
  }
  const message = getErrorMessage(error);
  if (missingProjectOwnerForTokenPattern.test(message)) {
    return "This project cannot be accessed through the Builder API with the current share link/token. Enable API access in the share-link settings, then relink the project with `webstudio init --link <share-link> --json`.";
  }
  return message;
};

export const getCliErrorMessage = (error: unknown, command = "mcp") => {
  const message = getCliErrorSummary(error, command);
  const issues = getValidationIssues(error);
  return issues === undefined || issues.length === 0
    ? message
    : formatValidationErrorMessage(message, issues);
};

export const getCliErrorIssues = getValidationIssues;
