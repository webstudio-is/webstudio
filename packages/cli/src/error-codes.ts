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

const genericTransportErrorCodes = new Set([
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL_ERROR",
  "INTERNAL_SERVER_ERROR",
  "MCP_RESOURCE_FAILED",
  "MCP_TOOL_FAILED",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "UNKNOWN",
]);

const getStableCode = (value: unknown) =>
  typeof value === "string" && stableErrorCodePattern.test(value)
    ? value
    : undefined;

export const getStableErrorCode = (error: unknown) => {
  const visited = new Set<unknown>();
  const visit = (value: unknown): string | undefined => {
    if (typeof value !== "object" || value === null || visited.has(value)) {
      return;
    }
    visited.add(value);
    const record = value as Record<string, unknown>;
    const data =
      typeof record.data === "object" && record.data !== null
        ? (record.data as Record<string, unknown>)
        : undefined;
    const webstudioCode =
      getStableCode(record.webstudioCode) ?? getStableCode(data?.webstudioCode);
    if (webstudioCode !== undefined) {
      return webstudioCode;
    }
    const directCode = getStableCode(record.code);
    if (
      directCode !== undefined &&
      genericTransportErrorCodes.has(directCode) === false
    ) {
      return directCode;
    }
    const nestedCode = visit(record.cause) ?? visit(data?.cause);
    if (nestedCode !== undefined) {
      return nestedCode;
    }
    return directCode ?? getApiErrorCode(value);
  };
  return visit(error);
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
