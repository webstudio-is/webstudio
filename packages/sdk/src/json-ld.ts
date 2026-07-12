import { appendJsonPath, getJsonLdTypes, isJsonObject } from "./json-ld-utils";

export type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdData =
  | JsonLdPrimitive
  | { [key: string]: JsonLdData }
  | JsonLdData[];
export type JsonLdValue = { [key: string]: JsonLdData } | JsonLdData[];

export type JsonLdStructuralDiagnostic = {
  severity: "error";
  code:
    | "invalid-json"
    | "invalid-root"
    | "invalid-context"
    | "invalid-keyword-value"
    | "invalid-value-object";
  path: string;
  message: string;
};

export type JsonLdValidationResult =
  | {
      success: true;
      value: JsonLdValue;
      diagnostics: JsonLdStructuralDiagnostic[];
    }
  | {
      success: false;
      value?: JsonLdValue;
      diagnostics: JsonLdStructuralDiagnostic[];
    };

const pushKeywordTypeError = (
  diagnostics: JsonLdStructuralDiagnostic[],
  path: string,
  message: string
) => {
  diagnostics.push({
    severity: "error",
    code: "invalid-keyword-value",
    path,
    message,
  });
};

export const escapeJsonLdScriptText = (value: string) =>
  value.replace(/</g, "\\u003c");

const validateContextTermDefinition = (
  definition: unknown,
  path: string,
  diagnostics: JsonLdStructuralDiagnostic[]
) => {
  if (
    definition === null ||
    typeof definition === "string" ||
    isJsonObject(definition)
  ) {
    if (isJsonObject(definition) && definition["@context"] !== undefined) {
      validateContext(
        definition["@context"],
        appendJsonPath(path, "@context"),
        diagnostics
      );
    }
    return;
  }
  diagnostics.push({
    severity: "error",
    code: "invalid-context",
    path,
    message: "JSON-LD context terms must map to a string, object, or null.",
  });
};

const validateContext = (
  context: unknown,
  path: string,
  diagnostics: JsonLdStructuralDiagnostic[]
) => {
  if (context === null || typeof context === "string") {
    return;
  }
  if (Array.isArray(context)) {
    context.forEach((item, index) =>
      validateContext(item, appendJsonPath(path, index), diagnostics)
    );
    return;
  }
  if (isJsonObject(context) === false) {
    diagnostics.push({
      severity: "error",
      code: "invalid-context",
      path,
      message: "@context must be a string, object, array of contexts, or null.",
    });
    return;
  }
  for (const keyword of ["@base", "@vocab", "@language"] as const) {
    if (
      context[keyword] !== undefined &&
      context[keyword] !== null &&
      typeof context[keyword] !== "string"
    ) {
      diagnostics.push({
        severity: "error",
        code: "invalid-context",
        path: appendJsonPath(path, keyword),
        message: `${keyword} must be a string or null.`,
      });
    }
  }
  if (
    context["@direction"] !== undefined &&
    context["@direction"] !== null &&
    context["@direction"] !== "ltr" &&
    context["@direction"] !== "rtl"
  ) {
    diagnostics.push({
      severity: "error",
      code: "invalid-context",
      path: appendJsonPath(path, "@direction"),
      message: '@direction must be "ltr", "rtl", or null.',
    });
  }
  if (
    context["@propagate"] !== undefined &&
    typeof context["@propagate"] !== "boolean"
  ) {
    diagnostics.push({
      severity: "error",
      code: "invalid-context",
      path: appendJsonPath(path, "@propagate"),
      message: "@propagate must be a boolean.",
    });
  }
  if (context["@version"] !== undefined && context["@version"] !== 1.1) {
    diagnostics.push({
      severity: "error",
      code: "invalid-context",
      path: appendJsonPath(path, "@version"),
      message: "@version must be 1.1.",
    });
  }
  for (const [term, definition] of Object.entries(context)) {
    if (term.startsWith("@")) {
      continue;
    }
    validateContextTermDefinition(
      definition,
      appendJsonPath(path, term),
      diagnostics
    );
  }
};

const validateNestedValues = (
  value: unknown,
  path: string,
  diagnostics: JsonLdStructuralDiagnostic[]
) => {
  if (isJsonObject(value)) {
    validateNode(value, path, diagnostics);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (isJsonObject(item) || Array.isArray(item)) {
        validateNestedValues(item, appendJsonPath(path, index), diagnostics);
      }
    });
  }
};

const validateNode = (
  value: unknown,
  path: string,
  diagnostics: JsonLdStructuralDiagnostic[]
) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNode(item, appendJsonPath(path, index), diagnostics)
    );
    return;
  }
  if (isJsonObject(value) === false) {
    diagnostics.push({
      severity: "error",
      code: "invalid-root",
      path,
      message: "JSON-LD nodes must be objects.",
    });
    return;
  }

  if (value["@context"] !== undefined) {
    validateContext(
      value["@context"],
      appendJsonPath(path, "@context"),
      diagnostics
    );
  }
  const typeValue = value["@type"];
  if (
    typeValue !== undefined &&
    (getJsonLdTypes(typeValue).length === 0 ||
      (Array.isArray(typeValue) && typeValue.length === 0))
  ) {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@type"),
      "@type must be a non-empty string or array of strings."
    );
  }
  if (value["@id"] !== undefined && typeof value["@id"] !== "string") {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@id"),
      "@id must be a string."
    );
  }
  if (
    value["@graph"] !== undefined &&
    isJsonObject(value["@graph"]) === false &&
    Array.isArray(value["@graph"]) === false
  ) {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@graph"),
      "@graph must be an object or array of objects."
    );
  }
  if (
    value["@language"] !== undefined &&
    value["@language"] !== null &&
    typeof value["@language"] !== "string"
  ) {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@language"),
      "@language must be a string or null."
    );
  }
  if (
    value["@nest"] !== undefined &&
    isJsonObject(value["@nest"]) === false &&
    (Array.isArray(value["@nest"]) === false ||
      value["@nest"].every(isJsonObject) === false)
  ) {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@nest"),
      "@nest must be an object or array of objects."
    );
  }
  if (
    value["@reverse"] !== undefined &&
    isJsonObject(value["@reverse"]) === false
  ) {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@reverse"),
      "@reverse must be an object."
    );
  }
  for (const keyword of ["@index"] as const) {
    if (value[keyword] !== undefined && typeof value[keyword] !== "string") {
      pushKeywordTypeError(
        diagnostics,
        appendJsonPath(path, keyword),
        `${keyword} must be a string.`
      );
    }
  }
  if (
    value["@direction"] !== undefined &&
    value["@direction"] !== "ltr" &&
    value["@direction"] !== "rtl" &&
    value["@direction"] !== null
  ) {
    pushKeywordTypeError(
      diagnostics,
      appendJsonPath(path, "@direction"),
      '@direction must be "ltr", "rtl", or null.'
    );
  }
  if ("@value" in value) {
    const invalidKeys = ["@id", "@graph", "@list", "@set", "@reverse"].filter(
      (key) => key in value
    );
    const isJsonLiteral = value["@type"] === "@json";
    const hasStructuredValue =
      typeof value["@value"] === "object" && value["@value"] !== null;
    if (
      invalidKeys.length > 0 ||
      (hasStructuredValue && isJsonLiteral === false) ||
      ("@type" in value &&
        value["@type"] !== "@json" &&
        ("@language" in value || "@direction" in value))
    ) {
      diagnostics.push({
        severity: "error",
        code: "invalid-value-object",
        path,
        message:
          "A JSON-LD value object has an incompatible keyword or @value shape.",
      });
    }
  }

  for (const [property, propertyValue] of Object.entries(value)) {
    const propertyPath = appendJsonPath(path, property);
    if (property === "@context") {
      continue;
    }
    if (["@graph", "@included", "@nest", "@reverse"].includes(property)) {
      validateNode(propertyValue, propertyPath, diagnostics);
      continue;
    }
    if (property.startsWith("@")) {
      if (["@list", "@set"].includes(property)) {
        validateNestedValues(propertyValue, propertyPath, diagnostics);
      }
      continue;
    }
    validateNestedValues(propertyValue, propertyPath, diagnostics);
  }
};

const isJsonLdData = (
  value: unknown,
  ancestors: Set<object>
): value is JsonLdData => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (typeof value !== "object" || value === null || ancestors.has(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value) === false && prototype !== Object.prototype) {
    return false;
  }
  ancestors.add(value);
  const isValid = Array.isArray(value)
    ? value.every((item) => isJsonLdData(item, ancestors))
    : Object.values(value).every((item) => isJsonLdData(item, ancestors));
  ancestors.delete(value);
  return isValid;
};

const isJsonLdValue = (value: unknown): value is JsonLdValue =>
  (Array.isArray(value) || isJsonObject(value)) &&
  isJsonLdData(value, new Set());

export const parseJsonLd = (
  input: unknown
): { success: true; value: JsonLdValue } | { success: false } => {
  try {
    const value: unknown =
      typeof input === "string" ? JSON.parse(input) : input;
    if (isJsonLdValue(value)) {
      return { success: true, value };
    }
  } catch {
    // Invalid JSON is represented by the unsuccessful result.
  }
  return { success: false };
};

export const validateJsonLd = (input: unknown): JsonLdValidationResult => {
  const parsed = parseJsonLd(input);
  if (parsed.success === false) {
    return {
      success: false,
      diagnostics: [
        {
          severity: "error",
          code: typeof input === "string" ? "invalid-json" : "invalid-root",
          path: "$",
          message: "JSON-LD must be a valid JSON object or array.",
        },
      ],
    };
  }
  const diagnostics: JsonLdStructuralDiagnostic[] = [];
  validateNode(parsed.value, "$", diagnostics);
  if (diagnostics.length > 0) {
    return { success: false, value: parsed.value, diagnostics };
  }
  return { success: true, value: parsed.value, diagnostics };
};

export const hasTopLevelJsonLdContext = (value: JsonLdValue) => {
  if (Array.isArray(value)) {
    return value.some(
      (item) => typeof item === "object" && item !== null && "@context" in item
    );
  }
  return "@context" in value;
};
