import { createElement } from "react";
import { parseJsonLd } from "@webstudio-is/sdk/runtime";
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

export const getFixedJsonCodeValue = (value: unknown, label: string) => {
  const result = validateJsonCode(value);
  if (result.success) {
    return { success: true as const, value: serializeJsonCode(result.value) };
  }
  const error = result.diagnostics.find(({ severity }) => severity === "error");
  return {
    success: false as const,
    message:
      error === undefined
        ? `${label} expects a JSON object or array`
        : `${label}: ${error.path} ${error.message}`,
  };
};

export const validateJsonCodeValue = (value: unknown, label: string) => {
  const result = getFixedJsonCodeValue(value, label);
  return result.success ? undefined : result.message;
};

const processJsonCodeValue = (
  value: string
): ReturnType<CodeControlBehavior["processValue"]> => {
  const result = validateJsonCode(value);
  const structuralError = result.diagnostics.find(
    ({ severity }) => severity === "error"
  );
  if (result.success === false || structuralError !== undefined) {
    return {
      success: false,
      issue: {
        message:
          structuralError === undefined
            ? "Enter a JSON object or array."
            : `${structuralError.path} ${structuralError.message}`,
        value,
      },
    };
  }
  const warnings = result.diagnostics.filter(
    ({ severity }) => severity === "warning"
  );
  const issue: CodeIssue | undefined =
    warnings.length === 0
      ? undefined
      : {
          severity: "warning",
          message: warnings
            .map(({ path, message }) => `${path} ${message}`)
            .join("\n"),
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
