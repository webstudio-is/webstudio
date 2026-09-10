import { z } from "zod";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { pointerSegments } from "@hyperjump/json-pointer";
import { isMap, parseDocument } from "yaml";
import { findMarkdownFrontmatter } from "./markdown-scanner";
import { URLPattern } from "urlpattern-polyfill";
import { getUtf8ByteLength } from "./byte-stream";
import {
  extractMarkdownFrontmatter,
  replaceMarkdownFrontmatter,
} from "./frontmatter";
import { contentEngineLimits } from "./limits";
import { parseMdxDocument } from "./mdx";
import {
  normalizeStructuredDataObject,
  StructuredDataError,
} from "./structured-data";

export const collectionConfigFilename = "collection.json";
/** Pass this value to remove an optional editable property inherited from the template. */
export const collectionEntryFieldClearValue = null;
const legacyCollectionSlugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
// Keep historical patterns recognizable even when the bundled schema changes.
// Each segment starts with a letter or number. Marks stay attached to preserve
// scripts such as Hindi; uppercase letters, separators and symbols are excluded.
const legacyUnicodeCollectionSlugPattern =
  "^(?!.*[\\p{Lu}\\p{Lt}])[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:-[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*$(?![\\s\\S])";
const collectionSlugSchemaId = "https://webstudio.is/schemas/slug";
const collectionSlugSchema = {
  $id: collectionSlugSchemaId,
  type: "string",
  pattern: legacyUnicodeCollectionSlugPattern,
};
const collectionSchemaDialect = "https://json-schema.org/draft/2020-12/schema";
const maximumPropertyKeyBytes = 256;
export const defaultCollectionTemplateFilename = "template.mdx";

const collectionSettings = z.object({
  template: z.string().min(1),
  entries: z
    .array(z.string().min(1).max(256))
    .min(1)
    .max(64)
    .default(["*.mdx"]),
  slugField: z.string().min(1).optional(),
  generateSlugFrom: z.string().min(1).optional(),
  entryPageId: z.string().min(1).optional(),
});

export type CollectionField = Readonly<{
  key: string;
  originalKey?: string;
  label: string;
  description?: string;
  type: "string" | "number" | "integer" | "boolean";
  control: "text" | "textarea" | "slug" | "number" | "checkbox";
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}>;

export type ContentCollectionConfig = Readonly<{
  schema: Record<string, unknown>;
  template: string;
  entries: readonly string[];
  matchesEntry: (filename: string) => boolean;
  slugField?: string;
  generateSlugFrom?: string;
  entryPageId?: string;
  fields: readonly CollectionField[];
  validate: (value: unknown) => { success: boolean; errors: ErrorObject[] };
}>;

export class ContentCollectionError extends Error {}

export class ContentCollectionInspectionError extends ContentCollectionError {
  fileId?: string;
  missingTemplateFilename?: string;
  forbiddenFileId?: string;
  repairAction?: "edit" | "move";
  templateFileId?: string;

  constructor(
    message: string,
    details: {
      fileId?: string;
      missingTemplateFilename?: string;
      forbiddenFileId?: string;
      repairAction?: "edit" | "move";
      templateFileId?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: details.cause });
    this.fileId = details.fileId;
    this.missingTemplateFilename = details.missingTemplateFilename;
    this.forbiddenFileId = details.forbiddenFileId;
    this.repairAction = details.repairAction;
    this.templateFileId = details.templateFileId;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const prototypeSensitiveKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

const validatePropertyKey = (key: string) => {
  if (prototypeSensitiveKeys.has(key)) {
    throw new ContentCollectionError(`Property key "${key}" is not supported`);
  }
  if (key.trim() === "") {
    throw new ContentCollectionError("Property keys cannot be empty");
  }
  if (getUtf8ByteLength(key) > maximumPropertyKeyBytes) {
    throw new ContentCollectionError(
      `Property key "${key.slice(0, 32)}…" exceeds the 256-byte limit`
    );
  }
};

type CollectionFieldType = "string" | "number" | "integer" | "boolean";

const collectionFieldTypes = new Set<CollectionFieldType>([
  "string",
  "number",
  "integer",
  "boolean",
]);

// Limit schemas to fields the configurator can represent. Ajv owns validation
// semantics; x-* extensions are preserved as annotations.
const commonSchemaKeywords = new Set([
  "type",
  "title",
  "description",
  "default",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
  "$comment",
]);

const schemaKeywordsByType: Readonly<
  Record<CollectionFieldType, ReadonlySet<string>>
> = {
  string: new Set(["minLength", "maxLength", "$ref"]),
  number: new Set(["minimum", "maximum"]),
  integer: new Set(["minimum", "maximum"]),
  boolean: new Set(),
};

const escapeJsonPointerSegment = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");

const getSchemaLocation = (path: readonly string[]) =>
  path.length === 0
    ? "schema root"
    : `#/${path.map(escapeJsonPointerSegment).join("/")}`;

const getSchemaKeywordLocation = (path: readonly string[], keyword: string) =>
  getSchemaLocation([...path, keyword]);

const getFieldSchemaType = (
  schema: Readonly<Record<string, unknown>>,
  path: readonly string[]
): CollectionFieldType => {
  if (
    typeof schema.type !== "string" ||
    collectionFieldTypes.has(schema.type as CollectionFieldType) === false
  ) {
    throw new ContentCollectionError(
      `type must be string, number, integer, or boolean at ${getSchemaKeywordLocation(
        path,
        "type"
      )}`
    );
  }
  return schema.type as CollectionFieldType;
};

const validateSchemaAnnotations = (
  schema: Readonly<Record<string, unknown>>,
  path: readonly string[]
) => {
  for (const keyword of ["title", "description", "$comment"] as const) {
    if (Object.hasOwn(schema, keyword) && typeof schema[keyword] !== "string") {
      throw new ContentCollectionError(
        `${keyword} must be a string at ${getSchemaKeywordLocation(
          path,
          keyword
        )}`
      );
    }
  }
  for (const keyword of ["deprecated", "readOnly", "writeOnly"] as const) {
    if (
      Object.hasOwn(schema, keyword) &&
      typeof schema[keyword] !== "boolean"
    ) {
      throw new ContentCollectionError(
        `${keyword} must be a boolean at ${getSchemaKeywordLocation(
          path,
          keyword
        )}`
      );
    }
  }
  if (
    Object.hasOwn(schema, "examples") &&
    Array.isArray(schema.examples) === false
  ) {
    throw new ContentCollectionError(
      `examples must be an array at ${getSchemaKeywordLocation(
        path,
        "examples"
      )}`
    );
  }
};

const getOptionalNonnegativeIntegerKeyword = ({
  schema,
  path,
  keyword,
}: {
  schema: Readonly<Record<string, unknown>>;
  path: readonly string[];
  keyword: "minLength" | "maxLength";
}) => {
  if (Object.hasOwn(schema, keyword) === false) {
    return;
  }
  const value = schema[keyword];
  if (
    typeof value !== "number" ||
    Number.isSafeInteger(value) === false ||
    value < 0
  ) {
    throw new ContentCollectionError(
      `${keyword} must be a whole number of zero or greater at ${getSchemaKeywordLocation(
        path,
        keyword
      )}`
    );
  }
  return value;
};

const getOptionalFiniteNumberKeyword = ({
  schema,
  path,
  keyword,
}: {
  schema: Readonly<Record<string, unknown>>;
  path: readonly string[];
  keyword: "minimum" | "maximum";
}) => {
  if (Object.hasOwn(schema, keyword) === false) {
    return;
  }
  const value = schema[keyword];
  if (typeof value !== "number" || Number.isFinite(value) === false) {
    throw new ContentCollectionError(
      `${keyword} must be a finite number at ${getSchemaKeywordLocation(
        path,
        keyword
      )}`
    );
  }
  return value;
};

const getRequiredPropertyKeys = ({
  schema,
  properties,
  path,
}: {
  schema: Readonly<Record<string, unknown>>;
  properties: Readonly<Record<string, unknown>>;
  path: readonly string[];
}) => {
  if (Object.hasOwn(schema, "required") === false) {
    return new Set<string>();
  }
  if (
    Array.isArray(schema.required) === false ||
    schema.required.some((key) => typeof key !== "string")
  ) {
    throw new ContentCollectionError(
      `required must be an array of property keys at ${getSchemaKeywordLocation(
        path,
        "required"
      )}`
    );
  }
  const required = schema.required as string[];
  if (new Set(required).size !== required.length) {
    throw new ContentCollectionError(
      `required cannot contain duplicate keys at ${getSchemaKeywordLocation(
        path,
        "required"
      )}`
    );
  }
  for (const key of required) {
    validatePropertyKey(key);
    if (Object.hasOwn(properties, key) === false) {
      throw new ContentCollectionError(
        `Required property "${key}" is not defined in properties`
      );
    }
  }
  return new Set(required);
};

const validateFieldSchema = (
  schema: Readonly<Record<string, unknown>>,
  path: readonly string[]
) => {
  const type = getFieldSchemaType(schema, path);
  const supportedTypeKeywords = schemaKeywordsByType[type];
  for (const keyword of Object.keys(schema)) {
    if (
      commonSchemaKeywords.has(keyword) ||
      supportedTypeKeywords.has(keyword) ||
      keyword.startsWith("x-")
    ) {
      continue;
    }
    throw new ContentCollectionError(
      `Unsupported JSON Schema keyword "${keyword}" at ${getSchemaLocation(
        path
      )}`
    );
  }
  validateSchemaAnnotations(schema, path);

  if (type === "string") {
    const minLength = getOptionalNonnegativeIntegerKeyword({
      schema,
      path,
      keyword: "minLength",
    });
    const maxLength = getOptionalNonnegativeIntegerKeyword({
      schema,
      path,
      keyword: "maxLength",
    });
    if (
      minLength !== undefined &&
      maxLength !== undefined &&
      minLength > maxLength
    ) {
      throw new ContentCollectionError(
        `minLength cannot exceed maxLength at ${getSchemaLocation(path)}`
      );
    }
  }

  if (type === "number" || type === "integer") {
    const minimum = getOptionalFiniteNumberKeyword({
      schema,
      path,
      keyword: "minimum",
    });
    const maximum = getOptionalFiniteNumberKeyword({
      schema,
      path,
      keyword: "maximum",
    });
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      throw new ContentCollectionError(
        `minimum cannot exceed maximum at ${getSchemaLocation(path)}`
      );
    }
    if (
      type === "integer" &&
      minimum !== undefined &&
      maximum !== undefined &&
      Math.ceil(minimum) > Math.floor(maximum)
    ) {
      throw new ContentCollectionError(
        `Limits must allow at least one whole number at ${getSchemaLocation(path)}`
      );
    }
  }
};

const validateCollectionSchema = (
  schema: Readonly<Record<string, unknown>>,
  properties: Readonly<Record<string, unknown>>
) => {
  const supportedRootKeywords = new Set([
    ...commonSchemaKeywords,
    "$schema",
    "properties",
    "required",
    "additionalProperties",
  ]);
  for (const keyword of Object.keys(schema)) {
    if (supportedRootKeywords.has(keyword) || keyword.startsWith("x-")) {
      continue;
    }
    throw new ContentCollectionError(
      `Unsupported JSON Schema keyword "${keyword}" at schema root`
    );
  }
  validateSchemaAnnotations(schema, []);
  if (
    Object.hasOwn(schema, "additionalProperties") &&
    typeof schema.additionalProperties !== "boolean"
  ) {
    throw new ContentCollectionError(
      "additionalProperties must be true or false at #/additionalProperties"
    );
  }
  getRequiredPropertyKeys({ schema, properties, path: [] });
  for (const [key, propertySchema] of Object.entries(properties)) {
    validatePropertyKey(key);
    if (isObject(propertySchema) === false) {
      throw new ContentCollectionError(
        `Property "${key}" must contain a schema object`
      );
    }
    if (Object.hasOwn(propertySchema, "$ref")) {
      if (propertySchema.$ref !== collectionSlugSchemaId) {
        throw new ContentCollectionError(
          `Unsupported schema reference at #/properties/${escapeJsonPointerSegment(key)}/$ref`
        );
      }
      if (
        propertySchema.type !== undefined &&
        propertySchema.type !== "string"
      ) {
        throw new ContentCollectionError(
          `Slug reference requires a string field at #/properties/${escapeJsonPointerSegment(key)}`
        );
      }
    }
    validateFieldSchema(
      propertySchema.$ref === collectionSlugSchemaId
        ? { type: "string", ...propertySchema }
        : propertySchema,
      ["properties", key]
    );
  }
};

const getNonnegativeInteger = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 0 ? Number(value) : undefined;

const getFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const getField = ({
  key,
  value,
  required,
}: {
  key: string;
  value: unknown;
  required: boolean;
}): CollectionField | undefined => {
  if (isObject(value) === false) {
    return;
  }
  const type =
    value.type ??
    (value.$ref === collectionSlugSchemaId ? "string" : undefined);
  const label =
    typeof value.title === "string" && value.title.trim() !== ""
      ? value.title
      : key;
  const description =
    typeof value.description === "string" && value.description.trim() !== ""
      ? value.description
      : undefined;
  const shared = {
    key,
    originalKey: key,
    label,
    description,
    required,
  };
  const rawExtension = value["x-webstudio"];
  if (Object.hasOwn(value, "x-webstudio") && isObject(rawExtension) === false) {
    throw new ContentCollectionError(
      `x-webstudio must be an object for property "${key}"`
    );
  }
  const extension = isObject(rawExtension) ? rawExtension : undefined;
  const declaredControl = extension?.control;
  const supportedControls =
    type === "string"
      ? new Set(["text", "textarea", "slug"])
      : type === "number" || type === "integer"
        ? new Set(["number"])
        : type === "boolean"
          ? new Set(["checkbox"])
          : new Set<string>();
  if (
    declaredControl !== undefined &&
    (typeof declaredControl !== "string" ||
      supportedControls.has(declaredControl) === false)
  ) {
    const control =
      typeof declaredControl === "string"
        ? `"${declaredControl}"`
        : JSON.stringify(declaredControl);
    throw new ContentCollectionError(
      `Control ${control} is not supported for property "${key}"`
    );
  }
  if (type === "string") {
    const hasSlugReference = value.$ref === collectionSlugSchemaId;
    if (declaredControl === "slug" && !hasSlugReference) {
      throw new ContentCollectionError(
        `Slug control for property "${key}" must use Webstudio's slug schema reference`
      );
    }
    if (hasSlugReference && declaredControl !== "slug") {
      throw new ContentCollectionError(
        `Webstudio's slug schema reference requires a slug control for property "${key}"`
      );
    }
    const control =
      declaredControl === "text" ||
      declaredControl === "textarea" ||
      declaredControl === "slug"
        ? declaredControl
        : "text";
    return {
      ...shared,
      type: "string",
      control,
      minLength: getNonnegativeInteger(value.minLength),
      maxLength: getNonnegativeInteger(value.maxLength),
    };
  }
  if (type === "number" || type === "integer") {
    return {
      ...shared,
      type: type,
      control: "number",
      minimum: getFiniteNumber(value.minimum),
      maximum: getFiniteNumber(value.maximum),
    };
  }
  if (type === "boolean") {
    return {
      ...shared,
      type: "boolean",
      control: "checkbox",
    };
  }
};

const validateTemplatePath = (template: string) => {
  if (
    template.endsWith(".mdx") === false ||
    template === ".mdx" ||
    template.includes("/") ||
    template.includes("\\") ||
    template === "." ||
    template === ".."
  ) {
    throw new ContentCollectionError(
      "Template must be an MDX file in the collection folder"
    );
  }
};

export const parseCollectionConfig = (
  source: string
): ContentCollectionConfig => {
  if (getUtf8ByteLength(source) > contentEngineLimits.jsonBytes) {
    throw new ContentCollectionError(
      "collection.json exceeds the 1 MiB size limit"
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new ContentCollectionError("collection.json contains invalid JSON");
  }
  if (isObject(value) === false) {
    throw new ContentCollectionError("collection.json must contain an object");
  }
  let schema: Record<string, unknown>;
  try {
    schema = normalizeStructuredDataObject(value, {
      depth: contentEngineLimits.jsonDepth,
      fields: contentEngineLimits.jsonFields,
      stringBytes: contentEngineLimits.jsonStringBytes,
      serializedBytes: contentEngineLimits.jsonBytes,
    });
  } catch (error) {
    if (error instanceof StructuredDataError) {
      throw new ContentCollectionError(
        error.code === "INVALID"
          ? "collection.json contains values that cannot be represented safely"
          : "collection.json exceeds the supported schema complexity",
        { cause: error }
      );
    }
    throw error;
  }
  if (schema.type !== "object" || isObject(schema.properties) === false) {
    throw new ContentCollectionError(
      "collection.json must describe an object with properties"
    );
  }
  if (
    Object.hasOwn(schema, "$schema") &&
    schema.$schema !== collectionSchemaDialect
  ) {
    throw new ContentCollectionError(
      "Only JSON Schema draft 2020-12 is supported"
    );
  }
  // Upgrade only previously generated rules, never arbitrary custom patterns.
  // This normalizes the in-memory config; the file changes only on settings save.
  for (const [key, property] of Object.entries(schema.properties)) {
    if (isObject(property) && Object.hasOwn(property, "pattern")) {
      if (
        property.pattern !== legacyCollectionSlugPattern &&
        property.pattern !== legacyUnicodeCollectionSlugPattern
      ) {
        throw new ContentCollectionError(
          `Only Webstudio's slug schema reference is supported; custom patterns are not supported at #/properties/${escapeJsonPointerSegment(key)}/pattern`
        );
      }
      if (property.$ref === undefined) {
        property.$ref = collectionSlugSchemaId;
      }
      delete property.pattern;
    }
  }
  validateCollectionSchema(schema, schema.properties);
  // Scope Ajv to this config so its generated-code registry cannot retain old
  // settings forever. Only bundled references are registered; no loadSchema.
  const validator = new Ajv2020({
    allErrors: true,
    strictSchema: false, // Preserve x-* annotations.
    strictTypes: false, // A referenced schema can supply the field's type.
    ownProperties: true,
    schemas: [collectionSlugSchema],
  });
  let parser;
  try {
    parser = validator.compile(schema);
  } catch (cause) {
    throw new ContentCollectionError("Invalid collection JSON Schema", {
      cause,
    });
  }
  const settingsResult = collectionSettings.safeParse(schema["x-webstudio"]);
  if (settingsResult.success === false) {
    throw new ContentCollectionError(
      "collection.json must define Webstudio collection settings"
    );
  }
  const settings = settingsResult.data;
  validateTemplatePath(settings.template);
  const patterns = settings.entries.map((value) => {
    const exclude = value.startsWith("!");
    const pattern = exclude ? value.slice(1) : value;
    if (pattern.length === 0 || pattern.includes("/")) {
      throw new ContentCollectionError(
        "Entry patterns must match filenames in the current folder, without slashes"
      );
    }
    try {
      return {
        exclude,
        pattern: new URLPattern(
          { pathname: `/${pattern}` },
          // Supported at runtime; urlpattern-polyfill 10.1.0 omits this overload.
          // @ts-expect-error Incomplete upstream constructor declarations.
          { ignoreCase: true }
        ),
      };
    } catch {
      throw new ContentCollectionError(
        `Invalid entry filename pattern "${value}"`
      );
    }
  });
  if (patterns.every(({ exclude }) => exclude)) {
    throw new ContentCollectionError(
      "Entry patterns need at least one inclusion pattern"
    );
  }
  const required = new Set(schema.required as string[] | undefined);
  const fields = Object.entries(schema.properties).map(([key, field]) => {
    const parsed = getField({ key, value: field, required: required.has(key) });
    if (parsed === undefined) {
      throw new ContentCollectionError(
        `Property "${key}" must use a supported flat field type`
      );
    }
    return parsed;
  });
  const slugField = fields.find(({ key }) => key === settings.slugField);
  if (settings.slugField !== undefined) {
    if (slugField === undefined) {
      throw new ContentCollectionError(
        "Slug field is not defined in properties"
      );
    }
    if (slugField.type !== "string") {
      throw new ContentCollectionError("Slug field must be a string");
    }
    if (slugField.required === false) {
      throw new ContentCollectionError("Slug field must be required");
    }
    if (slugField.control !== "slug") {
      throw new ContentCollectionError("Slug field must use the slug control");
    }
  }
  const additionalSlugField = fields.find(
    ({ key, control }) => key !== settings.slugField && control === "slug"
  );
  if (additionalSlugField !== undefined) {
    throw new ContentCollectionError(
      `Only the configured slug field can use the slug control; found "${additionalSlugField.key}"`
    );
  }
  const slugSourceField = fields.find(
    ({ key }) => key === settings.generateSlugFrom
  );
  if (settings.generateSlugFrom !== undefined) {
    if (settings.slugField === undefined) {
      throw new ContentCollectionError("Slug generation requires a slug field");
    }
    if (slugSourceField === undefined) {
      throw new ContentCollectionError(
        "Slug source field is not defined in properties"
      );
    }
    if (slugSourceField.type !== "string") {
      throw new ContentCollectionError("Slug source field must be a string");
    }
    if (settings.generateSlugFrom === settings.slugField) {
      throw new ContentCollectionError(
        "Slug source field must be different from the slug field"
      );
    }
  }
  return {
    schema,
    template: settings.template,
    entries: settings.entries,
    matchesEntry: (filename) => {
      if (
        filename.includes("/") ||
        filename === collectionConfigFilename ||
        filename === settings.template
      ) {
        return false;
      }
      const input = { pathname: `/${encodeURIComponent(filename)}` };
      return (
        patterns.some(
          ({ exclude, pattern }) => !exclude && pattern.test(input)
        ) &&
        !patterns.some(({ exclude, pattern }) => exclude && pattern.test(input))
      );
    },
    slugField: settings.slugField,
    generateSlugFrom: settings.generateSlugFrom,
    entryPageId: settings.entryPageId,
    fields,
    validate: (candidate) => ({
      success: parser(candidate),
      errors: parser.errors ?? [],
    }),
  };
};

export const normalizeCollectionSlug = (value: string) => {
  return (
    value
      .normalize("NFC")
      .toLowerCase()
      .normalize("NFC")
      .match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)
      ?.join("-") ?? ""
  );
};

const getValidationFieldKey = (issue: ErrorObject): string | undefined => {
  if (issue.keyword === "additionalProperties") {
    return issue.params.additionalProperty;
  }
  if (issue.keyword === "required") {
    return issue.params.missingProperty;
  }
  return pointerSegments(issue.instancePath).next().value;
};

const getValidationError = (
  config: ContentCollectionConfig,
  issue: ErrorObject
) => {
  const key = getValidationFieldKey(issue);
  const field = config.fields.find((candidate) => candidate.key === key);
  const label = field?.label ?? key ?? "Entry";
  if (issue.keyword === "minLength") {
    const minimum = Number(issue.params.limit);
    return `${label} must contain at least ${minimum} ${
      minimum === 1 ? "character" : "characters"
    }`;
  }
  if (issue.keyword === "maxLength") {
    const maximum = Number(issue.params.limit);
    return `${label} must contain at most ${maximum} ${
      maximum === 1 ? "character" : "characters"
    }`;
  }
  if (issue.keyword === "pattern" && field?.control === "slug") {
    return `${label}: Use lowercase letters and numbers separated by single dashes`;
  }
  if (issue.keyword === "required") {
    return `${label}: A value is required`;
  }
  if (issue.keyword === "additionalProperties") {
    return `${label}: This field is not defined in the collection`;
  }
  return `${label}: ${issue.message}`;
};

export const getCollectionValidationError = (
  config: ContentCollectionConfig,
  properties: unknown
) => {
  const validation = config.validate(properties);
  if (validation.success) {
    return;
  }
  return getValidationError(config, validation.errors[0]);
};

export const getCollectionEntryValidationIssues = ({
  config,
  properties,
  basename,
}: {
  config: ContentCollectionConfig;
  properties: Readonly<Record<string, unknown>>;
  basename: string;
}) => {
  const validation = config.validate(properties);
  const issues = validation.errors.map((issue) => ({
    fieldKey: getValidationFieldKey(issue),
    message: getValidationError(config, issue),
  }));
  if (
    config.slugField !== undefined &&
    properties[config.slugField] !== basename
  ) {
    issues.push({
      fieldKey: config.slugField,
      message: "The slug must match the entry filename",
    });
  }
  return issues;
};

/** Field ranges use the YAML parser, including quoted keys and multiline values. */
export const getCollectionEntrySourceIssues = async ({
  config,
  source,
  basename,
}: {
  config: ContentCollectionConfig;
  source: string;
  basename: string;
}) => {
  const { properties } = await extractMarkdownFrontmatter(source);
  const bytes = new TextEncoder().encode(source);
  const envelope = findMarkdownFrontmatter(bytes, true);
  const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
  const start = !envelope
    ? 0
    : decoder.decode(bytes.subarray(0, envelope.yamlStart)).length;
  const document = !envelope
    ? undefined
    : parseDocument(
        decoder.decode(bytes.subarray(envelope.yamlStart, envelope.yamlEnd))
      );
  return getCollectionEntryValidationIssues({
    config,
    properties,
    basename,
  }).map((issue) => {
    const node =
      document !== undefined &&
      isMap(document.contents) &&
      issue.fieldKey !== undefined
        ? document.contents.get(issue.fieldKey, true)
        : undefined;
    const range =
      node !== null && typeof node === "object" && "range" in node
        ? node.range
        : undefined;
    const from = range ? start + range[0] : start;
    const to = range ? start + range[1] : Math.min(source.length, from + 1);
    return { ...issue, from, to };
  });
};

export const getCollectionFieldValidationIssue = (
  config: ContentCollectionConfig,
  properties: unknown
) => {
  let validationProperties = properties;
  if (isObject(properties)) {
    const candidate = { ...properties };
    for (const field of config.fields) {
      if (
        field.required === false &&
        properties[field.key] === collectionEntryFieldClearValue
      ) {
        delete candidate[field.key];
      }
    }
    validationProperties = candidate;
  }
  const validation = config.validate(validationProperties);
  if (validation.success) {
    return;
  }
  const fieldKeys = new Set(config.fields.map(({ key }) => key));
  const issue = validation.errors.find((issue) => {
    const key = getValidationFieldKey(issue);
    return key !== undefined && fieldKeys.has(key);
  });
  if (issue === undefined) {
    return;
  }
  return {
    fieldKey: getValidationFieldKey(issue)!,
    message: getValidationError(config, issue),
  };
};

export const getCollectionFieldValidationError = (
  config: ContentCollectionConfig,
  properties: unknown
) => getCollectionFieldValidationIssue(config, properties)?.message;

export const getCollectionTemplateValidationError = (
  config: ContentCollectionConfig,
  properties: Readonly<Record<string, unknown>>
) => {
  const validation = config.validate(properties);
  if (validation.success) {
    return;
  }
  const issue = validation.errors.find((issue) => {
    if (issue.keyword === "additionalProperties") {
      return true;
    }
    const key = getValidationFieldKey(issue);
    return key !== undefined && Object.hasOwn(properties, key);
  });
  return issue === undefined ? undefined : getValidationError(config, issue);
};

const parseCollectionTemplate = async (source: string) => {
  try {
    return await parseMdxDocument({ source });
  } catch (error) {
    const details = error instanceof Error ? `: ${error.message}` : "";
    throw new ContentCollectionError(
      `Collection template is invalid${details}`,
      { cause: error }
    );
  }
};

export type ContentCollectionFile<File> = Readonly<{
  file: File;
  id: string;
  filename: string;
  basename: string;
  isMdx: boolean;
}>;

export const inspectContentCollection = async <File>({
  files,
  readSource,
  readFrontmatter,
  validateTemplate = true,
  validateEntries = true,
  entryIdsToValidate,
}: {
  files: readonly ContentCollectionFile<File>[];
  readSource: (file: ContentCollectionFile<File>) => Promise<string>;
  readFrontmatter?: (
    file: ContentCollectionFile<File>
  ) => Promise<Readonly<Record<string, unknown>>>;
  validateTemplate?: boolean;
  validateEntries?: boolean;
  entryIdsToValidate?: ReadonlySet<string>;
}) => {
  const configFiles = files.filter(
    (file) => file.filename === collectionConfigFilename
  );
  const configFile = configFiles[0];
  if (configFile === undefined || configFiles.length !== 1) {
    throw new ContentCollectionInspectionError(
      "A collection folder must contain exactly one collection.json",
      { fileId: configFile?.id }
    );
  }
  let config: ContentCollectionConfig;
  try {
    config = parseCollectionConfig(await readSource(configFile));
  } catch (error) {
    if (error instanceof ContentCollectionError === false) {
      throw error;
    }
    throw new ContentCollectionInspectionError(error.message, {
      fileId: configFile.id,
      repairAction: "edit",
      cause: error,
    });
  }
  const entryFiles = files.filter((file) => config.matchesEntry(file.filename));
  const forbiddenFile = entryFiles.find((file) => file.isMdx === false);
  if (forbiddenFile !== undefined) {
    throw new ContentCollectionInspectionError(
      `Collection entry "${forbiddenFile.filename}" must be an MDX file. Exclude it using the entry patterns.`,
      {
        fileId: forbiddenFile.id,
        forbiddenFileId: forbiddenFile.id,
        repairAction: "move",
      }
    );
  }
  const templateFiles = files.filter(
    (file) => file.filename === config.template && file.isMdx
  );
  const templateFile = templateFiles[0];
  if (templateFile === undefined) {
    throw new ContentCollectionInspectionError(
      `Collection template "${config.template}" not found`,
      {
        fileId: configFile.id,
        missingTemplateFilename: config.template,
      }
    );
  }
  if (templateFiles.length !== 1) {
    throw new ContentCollectionInspectionError(
      `Collection template "${config.template}" is ambiguous`,
      {
        fileId: templateFile.id,
        templateFileId: templateFile.id,
      }
    );
  }
  const filenames = new Set<string>();
  for (const file of [...entryFiles, configFile, templateFile]) {
    const normalizedFilename = file.filename.toLowerCase();
    if (filenames.has(normalizedFilename)) {
      throw new ContentCollectionInspectionError(
        `Collection folder contains duplicate filename "${file.filename}"`,
        {
          fileId: file.id,
          repairAction: "move",
          templateFileId: templateFile.id,
        }
      );
    }
    filenames.add(normalizedFilename);
  }
  let templateProperties: Readonly<Record<string, unknown>> = {};
  if (validateTemplate) {
    let templateDocument: Awaited<ReturnType<typeof parseCollectionTemplate>>;
    try {
      templateDocument = await parseCollectionTemplate(
        await readSource(templateFile)
      );
    } catch (error) {
      if (error instanceof ContentCollectionError === false) {
        throw error;
      }
      throw new ContentCollectionInspectionError(error.message, {
        fileId: templateFile.id,
        repairAction: "edit",
        templateFileId: templateFile.id,
        cause: error,
      });
    }
    templateProperties = templateDocument.frontmatter.properties;
    const templateError = getCollectionTemplateValidationError(
      config,
      templateProperties
    );
    if (templateError !== undefined) {
      throw new ContentCollectionInspectionError(
        `Collection template "${config.template}": ${templateError}`,
        {
          fileId: templateFile.id,
          repairAction: "edit",
          templateFileId: templateFile.id,
        }
      );
    }
  }
  if (validateEntries) {
    for (let index = 0; index < entryFiles.length; index += 1) {
      const entryFile = entryFiles[index];
      if (
        entryIdsToValidate !== undefined &&
        !entryIdsToValidate.has(entryFile.id)
      ) {
        continue;
      }
      let properties: Readonly<Record<string, unknown>>;
      try {
        properties =
          readFrontmatter === undefined
            ? (await extractMarkdownFrontmatter(await readSource(entryFile)))
                .properties
            : await readFrontmatter(entryFile);
      } catch (error) {
        if (error instanceof ContentCollectionError) {
          throw error;
        }
        const details = error instanceof Error ? `: ${error.message}` : "";
        throw new ContentCollectionInspectionError(
          `Collection entry "${entryFile.filename}" is invalid${details}`,
          {
            fileId: entryFile.id,
            repairAction: "edit",
            templateFileId: templateFile.id,
            cause: error,
          }
        );
      }
      const validationError = getCollectionValidationError(config, properties);
      if (validationError !== undefined) {
        throw new ContentCollectionInspectionError(
          `Collection entry "${entryFile.filename}": ${validationError}`,
          {
            fileId: entryFile.id,
            repairAction: "edit",
            templateFileId: templateFile.id,
          }
        );
      }
      if (
        config.slugField !== undefined &&
        properties[config.slugField] !== entryFile.basename
      ) {
        throw new ContentCollectionInspectionError(
          `Collection entry "${entryFile.filename}": The slug must match the entry filename`,
          {
            fileId: entryFile.id,
            repairAction: "edit",
            templateFileId: templateFile.id,
          }
        );
      }
    }
  }
  return {
    configFile,
    templateFile,
    entryFiles,
    config,
    templateProperties,
  };
};

export const createCollectionEntry = async ({
  config,
  templateSource,
  values,
  existingFilenames,
  requestId,
}: {
  config: ContentCollectionConfig;
  templateSource: string;
  values: Readonly<Record<string, unknown>>;
  existingFilenames: readonly string[];
  requestId?: string;
}) => {
  const template = await parseCollectionTemplate(templateSource);
  const frontmatter = { ...template.frontmatter.properties };
  const fields = new Map(config.fields.map((field) => [field.key, field]));
  for (const [key, value] of Object.entries(values)) {
    const field = fields.get(key);
    if (field === undefined) {
      throw new ContentCollectionError(
        `Property "${key}" cannot be set when creating an entry`
      );
    }
    if (value === collectionEntryFieldClearValue && field.required === false) {
      delete frontmatter[key];
      continue;
    }
    frontmatter[key] = value;
  }
  if (config.slugField !== undefined) {
    const currentSlug = frontmatter[config.slugField];
    if (typeof currentSlug !== "string" || currentSlug.trim() === "") {
      const source =
        config.generateSlugFrom === undefined
          ? undefined
          : frontmatter[config.generateSlugFrom];
      if (typeof source === "string") {
        frontmatter[config.slugField] = normalizeCollectionSlug(source);
      }
    } else {
      frontmatter[config.slugField] = normalizeCollectionSlug(currentSlug);
    }
  }
  const validationError = getCollectionValidationError(config, frontmatter);
  if (validationError !== undefined) {
    throw new ContentCollectionError(validationError);
  }
  const slug =
    config.slugField === undefined
      ? `entry-${requestId === undefined ? crypto.randomUUID() : z.uuid().parse(requestId)}`
      : frontmatter[config.slugField];
  if (typeof slug !== "string" || slug === "") {
    throw new ContentCollectionError("Slug cannot be empty");
  }
  const filename = `${slug}.mdx`;
  if (config.matchesEntry(filename) === false) {
    throw new ContentCollectionError(
      `The filename "${filename}" does not match the collection entry patterns`
    );
  }
  if (
    existingFilenames.some(
      (existingFilename) =>
        existingFilename.normalize("NFC").toLowerCase() ===
        filename.toLowerCase()
    )
  ) {
    throw new ContentCollectionError(
      `An entry named "${filename}" already exists`
    );
  }
  return {
    filename,
    frontmatter,
    source: await replaceMarkdownFrontmatter({
      source: templateSource,
      properties: frontmatter,
    }),
  };
};

export const createDefaultCollectionConfig = () =>
  `${JSON.stringify(
    {
      $schema: collectionSchemaDialect,
      title: "Collection entry",
      type: "object",
      required: ["title", "slug"],
      properties: {
        title: {
          title: "Title",
          description: "The entry title shown to readers.",
          type: "string",
          minLength: 1,
          maxLength: 120,
        },
        slug: {
          title: "URL slug",
          description: "The URL-safe name used in this entry's web address.",
          type: "string",
          minLength: 1,
          maxLength: 120,
          $ref: collectionSlugSchemaId,
          "x-webstudio": { control: "slug" },
        },
        draft: {
          title: "Draft",
          description:
            "Mark this entry so collection queries can exclude it from published lists.",
          type: "boolean",
        },
      },
      additionalProperties: false,
      "x-webstudio": {
        template: defaultCollectionTemplateFilename,
        entries: ["*.mdx"],
        slugField: "slug",
        generateSlugFrom: "title",
      },
    },
    undefined,
    2
  )}\n`;

export const createDefaultCollectionTemplate = () =>
  "---\ndraft: true\n---\n\nStart writing.\n";

/** Keep existing collections readable; only configuration changes need this guarantee. */
export const getCollectionEntryCreationError = (
  config: ContentCollectionConfig
) => {
  if (
    config.slugField === undefined &&
    (config.entries.length !== 1 ||
      !["*.mdx", "entry-*.mdx"].includes(config.entries[0]))
  ) {
    return "Without a Slug field, use *.mdx or entry-*.mdx for entry patterns so generated filenames always match. Add a Slug field to use custom patterns.";
  }
};

const serializeCollectionField = (
  field: CollectionField,
  originalValue: unknown
) => {
  const original = isObject(originalValue) ? originalValue : {};
  const result: Record<string, unknown> = {
    ...original,
    type: field.type,
  };
  const hasExplicitLabel =
    typeof original.title === "string" && original.title.trim() !== "";
  if (hasExplicitLabel || field.label !== field.key) {
    result.title = field.label;
  }
  if (field.description === undefined || field.description.trim() === "") {
    delete result.description;
  } else {
    result.description = field.description;
  }
  for (const keyword of [
    "properties",
    "required",
    "additionalProperties",
    "items",
    "minItems",
    "maxItems",
    "minLength",
    "maxLength",
    "pattern",
    "$ref",
    "minimum",
    "maximum",
  ]) {
    delete result[keyword];
  }
  if (field.type === "string") {
    if (field.minLength !== undefined) {
      result.minLength = field.minLength;
    }
    if (field.maxLength !== undefined) {
      result.maxLength = field.maxLength;
    }
  } else if (field.type === "number" || field.type === "integer") {
    if (field.minimum !== undefined) {
      result.minimum = field.minimum;
    }
    if (field.maximum !== undefined) {
      result.maximum = field.maximum;
    }
  }
  const originalExtension = isObject(original["x-webstudio"])
    ? original["x-webstudio"]
    : {};
  const preserveEmptyExtension =
    Object.hasOwn(original, "x-webstudio") &&
    Object.keys(originalExtension).length === 0;
  const extension = { ...originalExtension };
  delete extension.control;
  if (field.control === "textarea" || field.control === "slug") {
    extension.control = field.control;
  } else if (originalExtension.control === field.control) {
    extension.control = field.control;
  }
  if (Object.keys(extension).length === 0 && preserveEmptyExtension === false) {
    delete result["x-webstudio"];
  } else {
    result["x-webstudio"] = extension;
  }
  if (field.control === "slug") {
    result.$ref = collectionSlugSchemaId;
  }
  return result;
};

export const serializeCollectionConfig = ({
  config,
  fields,
  settings,
}: {
  config: ContentCollectionConfig;
  fields: readonly CollectionField[];
  settings?: {
    template?: string;
    slugField?: string;
    generateSlugFrom?: string;
    entryPageId?: string;
  };
}) => {
  const ownedOriginalKeys = new Set<string>();
  for (const { originalKey } of fields) {
    if (originalKey === undefined) {
      continue;
    }
    if (ownedOriginalKeys.has(originalKey)) {
      throw new ContentCollectionError(
        `Original field "${originalKey}" cannot be edited more than once`
      );
    }
    ownedOriginalKeys.add(originalKey);
  }
  const template = settings?.template ?? config.template;
  const slugField =
    settings && Object.hasOwn(settings, "slugField")
      ? settings.slugField
      : config.slugField;
  const generateSlugFrom =
    slugField === undefined
      ? undefined
      : settings && Object.hasOwn(settings, "generateSlugFrom")
        ? settings.generateSlugFrom
        : config.generateSlugFrom;
  const entryPageId =
    settings && Object.hasOwn(settings, "entryPageId")
      ? settings.entryPageId
      : config.entryPageId;
  const serializedFields = fields.map((field) => {
    if (field.key === slugField) {
      return field.type === "string"
        ? { ...field, control: "slug" as const, required: true }
        : { ...field, required: true };
    }
    if (field.control === "slug") {
      return { ...field, control: "text" as const };
    }
    return field;
  });
  const fieldKeys = serializedFields.map(({ key }) => key);
  if (
    fieldKeys.some((key) => key.trim() === "") ||
    new Set(fieldKeys).size !== fieldKeys.length
  ) {
    throw new ContentCollectionError(
      "Every field needs a non-empty, unique key"
    );
  }
  if (serializedFields.some(({ label }) => label.trim() === "")) {
    throw new ContentCollectionError("Every field needs a label");
  }
  for (const field of serializedFields) {
    validatePropertyKey(field.key);
  }
  const originalProperties = isObject(config.schema.properties)
    ? config.schema.properties
    : {};
  const originalSettings = isObject(config.schema["x-webstudio"])
    ? { ...config.schema["x-webstudio"] }
    : {};
  delete originalSettings.previewPage;
  const value = {
    ...config.schema,
    required: serializedFields
      .filter(({ required }) => required)
      .map(({ key }) => key),
    properties: Object.fromEntries(
      serializedFields.map((field) => [
        field.key,
        serializeCollectionField(
          field,
          field.originalKey === undefined
            ? undefined
            : originalProperties[field.originalKey]
        ),
      ])
    ),
    "x-webstudio": {
      ...originalSettings,
      template,
      slugField,
      generateSlugFrom,
      entryPageId,
    },
  };
  const source = `${JSON.stringify(value, undefined, 2)}\n`;
  parseCollectionConfig(source);
  return source;
};

/** Identify the input responsible for a field's invalid limits. */
export const getCollectionFieldLimitsIssue = (field: CollectionField) => {
  // The referenced slug schema requires a nonempty value even when the local
  // minLength is unset. Keep existing configurations readable for repairs.
  if (field.control === "slug" && field.maxLength === 0) {
    return {
      input: "maxLength",
      message: "A slug must allow at least one character.",
    };
  }
  try {
    validateFieldSchema(serializeCollectionField(field, undefined), [
      "properties",
      field.key,
    ]);
  } catch (error) {
    const input =
      field.type === "string"
        ? field.minLength !== undefined &&
          (!Number.isSafeInteger(field.minLength) || field.minLength < 0)
          ? "minLength"
          : "maxLength"
        : field.minimum !== undefined && !Number.isFinite(field.minimum)
          ? "minimum"
          : "maximum";
    return {
      input,
      message:
        error instanceof Error ? error.message : "Check this field’s limits.",
    };
  }
};
