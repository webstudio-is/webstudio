import {
  getInputJsonSchemaProperties,
  type InputJsonSchema,
} from "@webstudio-is/sdk";
import { z } from "zod";
import { getInputSchemaMetadata } from "../contracts/input-schema";

export type BuilderRuntimeErrorCode =
  | "BAD_REQUEST"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFLICT";

const semanticValidationIssueSchema = z.object({
  code: z.string(),
  path: z.array(z.string()),
  message: z.string(),
  constraint: z.string(),
  example: z.unknown().optional(),
  detail: z.string().optional(),
});
const semanticValidationIssuesSchema = z.array(semanticValidationIssueSchema);

export type SemanticValidationIssue = z.infer<
  typeof semanticValidationIssueSchema
>;

export const semanticValidationIssuesJsonSchema = getInputSchemaMetadata(
  semanticValidationIssuesSchema
).inputJsonSchema;

const quotedSensitiveValidationDetailPattern =
  /(authorization|authToken|password|secret|token)(["']?\s*[:=]\s*)(["'])[^"']*\3/gi;
const unquotedSensitiveValidationDetailPattern =
  /(authorization|authToken|password|secret|token)(["']?\s*[:=]\s*)(?!["'])[^,\s}]+/gi;
const sensitiveValidationQueryPattern =
  /([?&](?:authToken|password|secret|token)=)[^&\s]+/gi;

export const sanitizeValidationDetail = (detail: string) =>
  detail
    .split("\n")
    .filter((line) => /^\s*at\s/.test(line) === false)
    .join("\n")
    .replace(quotedSensitiveValidationDetailPattern, "$1$2$3[redacted]$3")
    .replace(unquotedSensitiveValidationDetailPattern, "$1$2[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(sensitiveValidationQueryPattern, "$1[redacted]");

const sanitizeValidationIssues = (
  issues: readonly SemanticValidationIssue[]
): SemanticValidationIssue[] =>
  issues.map((issue) => ({
    ...issue,
    ...(issue.detail === undefined
      ? {}
      : { detail: sanitizeValidationDetail(issue.detail) }),
  }));

type BuilderRuntimeErrorOptions = {
  issues?: readonly SemanticValidationIssue[];
};

export class BuilderRuntimeError extends Error {
  code: BuilderRuntimeErrorCode;
  issues?: readonly SemanticValidationIssue[];

  constructor(
    code: BuilderRuntimeErrorCode,
    message: string,
    options: BuilderRuntimeErrorOptions = {}
  ) {
    super(message);
    this.name = "BuilderRuntimeError";
    this.code = code;
    this.issues = options.issues;
  }
}

export const throwBuilderRuntimeError = (
  code: BuilderRuntimeErrorCode,
  message: string,
  options?: BuilderRuntimeErrorOptions
): never => {
  throw new BuilderRuntimeError(code, message, options);
};

export const throwBuilderValidationError = (
  message: string,
  issues: readonly SemanticValidationIssue[]
): never =>
  throwBuilderRuntimeError("INVALID_INPUT", message, {
    issues,
  });

const getJsonSchemaAtPath = (
  schema: InputJsonSchema | undefined,
  path: readonly PropertyKey[]
) => {
  let current = schema;
  for (const segment of path) {
    if (current === undefined) {
      return;
    }
    if (current.type === "array" && typeof segment === "number") {
      current = current.items as InputJsonSchema | undefined;
      continue;
    }
    const properties = getInputJsonSchemaProperties(current);
    current = properties?.[String(segment)] as InputJsonSchema | undefined;
  }
  return current;
};

export const getJsonSchemaExample = (
  schema: InputJsonSchema | undefined,
  depth = 0
): unknown => {
  if (schema === undefined || depth > 4) {
    return undefined;
  }
  if (schema.default !== undefined) {
    return schema.default;
  }
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }
  if ("const" in schema) {
    return schema.const;
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum[0];
  }
  if (Array.isArray(schema.anyOf)) {
    return getJsonSchemaExample(schema.anyOf[0] as InputJsonSchema, depth + 1);
  }
  if (Array.isArray(schema.oneOf)) {
    return getJsonSchemaExample(schema.oneOf[0] as InputJsonSchema, depth + 1);
  }
  if (Array.isArray(schema.allOf)) {
    const examples = schema.allOf.map((item) =>
      getJsonSchemaExample(item as InputJsonSchema, depth + 1)
    );
    return examples.every(
      (example) =>
        typeof example === "object" &&
        example !== null &&
        Array.isArray(example) === false
    )
      ? Object.assign({}, ...examples)
      : examples[0];
  }
  if (schema.type === "object") {
    const properties = getInputJsonSchemaProperties(schema) ?? {};
    const required = new Set(schema.required ?? []);
    return Object.fromEntries(
      Object.entries(properties)
        .filter(([name]) => required.has(name))
        .map(([name, property]) => [
          name,
          getJsonSchemaExample(property as InputJsonSchema, depth + 1),
        ])
    );
  }
  if (schema.type === "array") {
    return Array.from({ length: schema.minItems ?? 0 }, () =>
      getJsonSchemaExample(schema.items as InputJsonSchema, depth + 1)
    );
  }
  if (schema.type === "number" || schema.type === "integer") {
    return typeof schema.exclusiveMinimum === "number"
      ? schema.exclusiveMinimum + 1
      : (schema.minimum ?? 0);
  }
  if (schema.type === "boolean") {
    return true;
  }
  if (schema.type === "string") {
    const formatExamples: Record<string, string> = {
      email: "user@example.com",
      uri: "https://example.com",
      url: "https://example.com",
      uuid: "00000000-0000-4000-8000-000000000000",
      date: "2026-01-01",
      "date-time": "2026-01-01T00:00:00.000Z",
    };
    const base =
      typeof schema.format === "string"
        ? (formatExamples[schema.format] ?? "string")
        : "string";
    return base.padEnd(schema.minLength ?? 0, "x");
  }
};

const getZodIssueConstraint = (issue: z.core.$ZodIssue) => {
  if (
    "params" in issue &&
    typeof issue.params === "object" &&
    issue.params !== null &&
    "constraint" in issue.params &&
    typeof issue.params.constraint === "string"
  ) {
    return issue.params.constraint;
  }
  if (issue.code === "invalid_type") {
    return `type:${issue.expected}`;
  }
  if (issue.code === "unrecognized_keys") {
    return "recognized_keys_only";
  }
  if (issue.code === "invalid_value") {
    return `one_of:${JSON.stringify(issue.values)}`;
  }
  if (issue.code === "too_small") {
    return `${issue.origin}:minimum:${String(issue.minimum)}`;
  }
  if (issue.code === "too_big") {
    return `${issue.origin}:maximum:${String(issue.maximum)}`;
  }
  if (issue.code === "invalid_format") {
    return `format:${issue.format}`;
  }
  return issue.code;
};

const flattenZodIssue = (
  issue: z.core.$ZodIssue,
  parentPath: readonly PropertyKey[] = []
): z.core.$ZodIssue[] => {
  const path = [...parentPath, ...issue.path];
  if (issue.code !== "invalid_union" || issue.errors.length === 0) {
    return [{ ...issue, path }];
  }
  const closestBranch = issue.errors.reduce((closest, branch) =>
    branch.length < closest.length ? branch : closest
  );
  return closestBranch.flatMap((nestedIssue) =>
    flattenZodIssue(nestedIssue, path)
  );
};

export const getZodValidationIssues = (
  error: z.ZodError,
  inputSchema?: InputJsonSchema
): SemanticValidationIssue[] =>
  error.issues
    .flatMap((issue) => flattenZodIssue(issue))
    .flatMap((issue) => {
      const params =
        "params" in issue &&
        typeof issue.params === "object" &&
        issue.params !== null
          ? issue.params
          : undefined;
      const example =
        issue.code === "unrecognized_keys"
          ? undefined
          : params !== undefined && "example" in params
            ? params.example
            : getJsonSchemaExample(
                getJsonSchemaAtPath(inputSchema, issue.path)
              );
      const detail =
        params !== undefined &&
        "detail" in params &&
        typeof params.detail === "string"
          ? params.detail
          : undefined;
      const semanticCode =
        params !== undefined &&
        "semanticCode" in params &&
        typeof params.semanticCode === "string"
          ? params.semanticCode
          : issue.code;
      const message =
        params !== undefined &&
        "semanticMessage" in params &&
        typeof params.semanticMessage === "string"
          ? params.semanticMessage
          : issue.message;
      const createIssue = (path: PropertyKey[]): SemanticValidationIssue => ({
        code: semanticCode,
        path: path.map(String),
        message,
        constraint: getZodIssueConstraint(issue),
        ...(example === undefined ? {} : { example }),
        ...(detail === undefined
          ? {}
          : { detail: sanitizeValidationDetail(detail) }),
      });
      if (issue.code === "unrecognized_keys") {
        return issue.keys.map((key) => createIssue([...issue.path, key]));
      }
      return [createIssue(issue.path)];
    });

export const getZodValidationIssueOptions = (
  issue: SemanticValidationIssue,
  options: { message?: string } = {}
) => ({
  path: issue.path,
  message: options.message ?? issue.message,
  params: {
    semanticCode: issue.code,
    ...(options.message === undefined || options.message === issue.message
      ? {}
      : { semanticMessage: issue.message }),
    constraint: issue.constraint,
    ...(issue.example === undefined ? {} : { example: issue.example }),
    ...(issue.detail === undefined ? {} : { detail: issue.detail }),
  },
});

export const addZodValidationIssue = (
  context: z.RefinementCtx,
  issue: SemanticValidationIssue,
  options: { message?: string } = {}
) => {
  context.addIssue({
    code: "custom",
    ...getZodValidationIssueOptions(issue, options),
  });
};

export const formatValidationIssues = (
  issues: readonly SemanticValidationIssue[]
) =>
  issues
    .map((issue) => {
      const path = issue.path.length === 0 ? "input" : issue.path.join(".");
      const message = issue.message.replace(/[.\s]+$/, "");
      const example =
        issue.example === undefined
          ? ""
          : ` Example: ${JSON.stringify(issue.example)}.`;
      const detail =
        issue.detail === undefined
          ? ""
          : ` Detail: ${sanitizeValidationDetail(issue.detail)}`;
      return `${path}: ${message} (${issue.constraint}).${example}${detail}`;
    })
    .join("\n");

export const formatValidationIssueMessages = (
  issues: readonly SemanticValidationIssue[]
) =>
  issues
    .map((issue) => {
      const path = issue.path.length === 0 ? "input" : issue.path.join(".");
      const detail =
        issue.detail === undefined
          ? ""
          : `: ${sanitizeValidationDetail(issue.detail)}`;
      return `${path}: ${issue.message}${detail}`;
    })
    .join("\n");

export const prefixValidationIssuePaths = (
  issues: readonly SemanticValidationIssue[],
  prefix: readonly string[]
): SemanticValidationIssue[] =>
  prefix.length === 0
    ? [...issues]
    : issues.map((issue) => ({
        ...issue,
        path: [...prefix, ...issue.path],
      }));

export const getValidationIssues = (error: unknown) => {
  if (error instanceof BuilderRuntimeError) {
    return error.issues === undefined
      ? undefined
      : sanitizeValidationIssues(error.issues);
  }
  if (error instanceof z.ZodError) {
    return getZodValidationIssues(error);
  }
  if (typeof error === "object" && error !== null) {
    const directIssues = "issues" in error ? error.issues : undefined;
    const data = "data" in error ? error.data : undefined;
    const nestedIssues =
      typeof data === "object" && data !== null && "issues" in data
        ? data.issues
        : undefined;
    const result = semanticValidationIssuesSchema.safeParse(
      directIssues ?? nestedIssues
    );
    if (result.success) {
      return sanitizeValidationIssues(result.data);
    }
  }
};
