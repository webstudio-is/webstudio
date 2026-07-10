import type { z } from "zod";

const getPathValue = (value: unknown, path: z.ZodIssue["path"]): unknown => {
  let current = value;
  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current;
};

const getJsonType = (value: unknown) => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
};

const formatZodIssueMessage = (issue: z.ZodIssue, input: unknown) => {
  if (issue.code === "invalid_type") {
    const value = getPathValue(input, issue.path);
    if (value === undefined) {
      return "Required";
    }
    return `Expected ${issue.expected}, received ${getJsonType(value)}`;
  }
  return issue.message;
};

export const formatZodIssues = (issues: z.ZodIssue[], input: unknown) =>
  issues
    .map((issue) => {
      const path = issue.path.join(".");
      const message = formatZodIssueMessage(issue, input);
      return path === "" ? message : `${path}: ${message}`;
    })
    .join(", ");
