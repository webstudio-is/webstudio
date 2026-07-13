import { createElement } from "react";
import {
  hasTopLevelJsonLdContext,
  parseJsonLd,
} from "@webstudio-is/sdk/runtime";
import { validateJsonLdWithSchemaOrg } from "@webstudio-is/sdk/schema-org";
import type { ControlProps } from "../shared";
import { CodeControl, type CodeControlBehavior, type CodeIssue } from "./code";

export const formatJsonCode = (value: unknown) => {
  if (typeof value === "string") {
    const parsed = parseJsonCode(value);
    if (parsed.success) {
      value = parsed.value;
    } else {
      return value;
    }
  }
  return JSON.stringify(value ?? {}, undefined, 2) ?? "{}";
};

export const parseJsonCode = (
  source: string
): { success: true; value: object } | { success: false } => {
  return parseJsonLd(source);
};

export const serializeJsonCode = (value: object) => JSON.stringify(value);

export const validateJsonCode = (value: unknown) =>
  validateJsonLdWithSchemaOrg(value);

const getJsonCodeError = (
  result: Extract<ReturnType<typeof validateJsonCode>, { success: false }>
) => {
  const [error] = result.diagnostics;
  return `${error.path} ${error.message}`;
};

const getJsonCodeWarnings = (
  result: Extract<ReturnType<typeof validateJsonCode>, { success: true }>
) => {
  const warnings = result.diagnostics
    .filter(({ severity }) => severity === "warning")
    .map(({ path, message }) => `${path} ${message}`);
  if (hasTopLevelJsonLdContext(result.value) === false) {
    warnings.unshift("$ JSON-LD has no top-level @context.");
  }
  return warnings;
};

export const getFixedJsonCodeValue = (value: unknown, label: string) => {
  const result = validateJsonCode(value);
  if (result.success) {
    return { success: true as const, value: serializeJsonCode(result.value) };
  }
  return {
    success: false as const,
    message: `${label}: ${getJsonCodeError(result)}`,
  };
};

export const validateJsonCodeValue = (value: unknown, label: string) => {
  const result = validateJsonCode(value);
  if (result.success === false) {
    return `${label}: ${getJsonCodeError(result)}`;
  }
  const warnings = getJsonCodeWarnings(result).map(
    (message) => `${label}: ${message}`
  );
  return warnings.length === 0 ? undefined : warnings.join("\n");
};

export const processJsonCodeValue = (
  value: string
): ReturnType<CodeControlBehavior["processValue"]> => {
  const result = validateJsonCode(value);
  if (result.success === false) {
    return {
      success: false,
      issue: {
        message: getJsonCodeError(result),
        value,
      },
    };
  }
  const warnings = getJsonCodeWarnings(result);
  const issue: CodeIssue | undefined =
    warnings.length === 0
      ? undefined
      : {
          severity: "warning",
          message: warnings.join("\n"),
          value,
        };
  return {
    success: true,
    value: serializeJsonCode(result.value),
    issue,
  };
};

const jsonCodeBehavior: CodeControlBehavior = {
  autoSave: false,
  formatValue: formatJsonCode,
  processValue: processJsonCodeValue,
  validateBinding: validateJsonCodeValue,
  getFixedValue: getFixedJsonCodeValue,
};

export const JsonCodeControl = ({
  meta,
  ...props
}: ControlProps<"json-code">) =>
  createElement(CodeControl, {
    ...props,
    meta: { ...meta, control: "code", language: "json" },
    behavior: jsonCodeBehavior,
  });
