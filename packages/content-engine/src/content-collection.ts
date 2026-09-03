import { z } from "zod";
import { getUtf8ByteLength } from "./byte-stream";
import { replaceMarkdownFrontmatter } from "./frontmatter";
import { contentEngineLimits } from "./limits";
import { parseMdxDocument } from "./mdx";
import {
  normalizeStructuredDataObject,
  StructuredDataError,
} from "./structured-data";

export const collectionConfigFilename = "collection.json";
/** Pass this value to remove an optional editable property inherited from the template. */
export const collectionEntryFieldClearValue = null;
const collectionSlugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const collectionSlugRegex = new RegExp(collectionSlugPattern);
const collectionSchemaDialect = "https://json-schema.org/draft/2020-12/schema";
const maximumPropertyKeyBytes = 256;
export const defaultCollectionTemplateFilename = "template.mdx";

const collectionSettings = z.object({
  template: z.string().min(1),
  slugField: z.string().min(1),
  generateSlugFrom: z.string().min(1),
  previewPage: z.string().min(1).optional(),
});

export type CollectionField = Readonly<{
  key: string;
  originalKey?: string;
  label: string;
  type: "string" | "number" | "integer" | "boolean";
  control: "text" | "textarea" | "slug" | "number" | "checkbox";
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  defaultValue?: unknown;
}>;

export type ContentCollectionConfig = Readonly<{
  schema: Record<string, unknown>;
  template: string;
  slugField: string;
  generateSlugFrom: string;
  previewPage?: string;
  fields: readonly CollectionField[];
  validate: (value: unknown) => z.ZodSafeParseResult<unknown>;
}>;

export class ContentCollectionError extends Error {}

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

type SupportedSchemaType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

const supportedSchemaTypes = new Set<SupportedSchemaType>([
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null",
]);

// Keep acceptance and compilation in one allowlist so a new schema keyword
// cannot be accepted without implementing its validation semantics. x-*
// extensions are preserved as annotations and never affect validation.
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
  Record<SupportedSchemaType, ReadonlySet<string>>
> = {
  object: new Set(["properties", "required", "additionalProperties"]),
  array: new Set(["items", "minItems", "maxItems"]),
  string: new Set(["minLength", "maxLength", "pattern"]),
  number: new Set(["minimum", "maximum"]),
  integer: new Set(["minimum", "maximum"]),
  boolean: new Set(),
  null: new Set(),
};

const escapeJsonPointerSegment = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");

const getSchemaLocation = (path: readonly string[]) =>
  path.length === 0
    ? "schema root"
    : `#/${path.map(escapeJsonPointerSegment).join("/")}`;

const getSchemaKeywordLocation = (path: readonly string[], keyword: string) =>
  getSchemaLocation([...path, keyword]);

const getSchemaType = (
  schema: Readonly<Record<string, unknown>>,
  path: readonly string[]
): SupportedSchemaType => {
  if (
    typeof schema.type !== "string" ||
    supportedSchemaTypes.has(schema.type as SupportedSchemaType) === false
  ) {
    throw new ContentCollectionError(
      `type must be one supported JSON Schema type at ${getSchemaKeywordLocation(
        path,
        "type"
      )}`
    );
  }
  return schema.type as SupportedSchemaType;
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
  keyword: "minLength" | "maxLength" | "minItems" | "maxItems";
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

const compileSupportedSchema = (
  schema: Readonly<Record<string, unknown>>,
  path: readonly string[] = []
): z.ZodType => {
  const type = getSchemaType(schema, path);
  const supportedTypeKeywords = schemaKeywordsByType[type];
  for (const keyword of Object.keys(schema)) {
    if (
      commonSchemaKeywords.has(keyword) ||
      supportedTypeKeywords.has(keyword) ||
      keyword.startsWith("x-") ||
      (path.length === 0 && keyword === "$schema")
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
    if (Object.hasOwn(schema, "pattern")) {
      if (schema.pattern !== collectionSlugPattern) {
        throw new ContentCollectionError(
          `Only Webstudio's fixed slug pattern is supported at ${getSchemaKeywordLocation(
            path,
            "pattern"
          )}`
        );
      }
    }
    return z.string().superRefine((value, context) => {
      const length = Array.from(value).length;
      if (minLength !== undefined && length < minLength) {
        context.addIssue({
          input: value,
          code: "too_small",
          origin: "string",
          minimum: minLength,
          inclusive: true,
          message: `Too small: expected string to have >=${minLength} characters`,
        });
      }
      if (maxLength !== undefined && length > maxLength) {
        context.addIssue({
          input: value,
          code: "too_big",
          origin: "string",
          maximum: maxLength,
          inclusive: true,
          message: `Too big: expected string to have <=${maxLength} characters`,
        });
      }
      if (
        schema.pattern === collectionSlugPattern &&
        collectionSlugRegex.test(value) === false
      ) {
        context.addIssue({
          input: value,
          code: "invalid_format",
          format: "regex",
          pattern: collectionSlugPattern,
          message: `Invalid string: must match pattern ${collectionSlugPattern}`,
        });
      }
    });
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
    let parser = type === "integer" ? z.number().int() : z.number();
    if (minimum !== undefined) {
      parser = parser.gte(minimum);
    }
    if (maximum !== undefined) {
      parser = parser.lte(maximum);
    }
    return parser;
  }

  if (type === "boolean") {
    return z.boolean();
  }
  if (type === "null") {
    return z.null();
  }
  if (type === "array") {
    const minItems = getOptionalNonnegativeIntegerKeyword({
      schema,
      path,
      keyword: "minItems",
    });
    const maxItems = getOptionalNonnegativeIntegerKeyword({
      schema,
      path,
      keyword: "maxItems",
    });
    if (
      minItems !== undefined &&
      maxItems !== undefined &&
      minItems > maxItems
    ) {
      throw new ContentCollectionError(
        `minItems cannot exceed maxItems at ${getSchemaLocation(path)}`
      );
    }
    let itemParser: z.ZodType = z.unknown();
    if (Object.hasOwn(schema, "items")) {
      if (isObject(schema.items) === false) {
        throw new ContentCollectionError(
          `items must be a schema object at ${getSchemaKeywordLocation(
            path,
            "items"
          )}`
        );
      }
      itemParser = compileSupportedSchema(schema.items, [...path, "items"]);
    }
    let parser = z.array(itemParser);
    if (minItems !== undefined) {
      parser = parser.min(minItems);
    }
    if (maxItems !== undefined) {
      parser = parser.max(maxItems);
    }
    return parser;
  }

  let properties: Readonly<Record<string, unknown>> = {};
  if (Object.hasOwn(schema, "properties")) {
    if (isObject(schema.properties) === false) {
      throw new ContentCollectionError(
        `properties must be an object at ${getSchemaKeywordLocation(
          path,
          "properties"
        )}`
      );
    }
    properties = schema.properties;
  }
  const required = getRequiredPropertyKeys({ schema, properties, path });
  const shape: Record<string, z.ZodType> = {};
  for (const [key, propertySchema] of Object.entries(properties)) {
    validatePropertyKey(key);
    if (isObject(propertySchema) === false) {
      throw new ContentCollectionError(
        `Property "${key}" must contain a schema object`
      );
    }
    const propertyParser = compileSupportedSchema(propertySchema, [
      ...path,
      "properties",
      key,
    ]);
    shape[key] = required.has(key) ? propertyParser : propertyParser.optional();
  }
  if (
    Object.hasOwn(schema, "additionalProperties") &&
    typeof schema.additionalProperties !== "boolean"
  ) {
    throw new ContentCollectionError(
      `additionalProperties must be true or false at ${getSchemaKeywordLocation(
        path,
        "additionalProperties"
      )}`
    );
  }
  const parser = z.object(shape);
  return schema.additionalProperties === false ? parser.strict() : parser;
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
  const label =
    typeof value.title === "string" && value.title.trim() !== ""
      ? value.title
      : key;
  const rawExtension = value["x-webstudio"];
  if (Object.hasOwn(value, "x-webstudio") && isObject(rawExtension) === false) {
    throw new ContentCollectionError(
      `x-webstudio must be an object for property "${key}"`
    );
  }
  const extension = isObject(rawExtension) ? rawExtension : undefined;
  const declaredControl = extension?.control;
  const supportedControls =
    value.type === "string"
      ? new Set(["text", "textarea", "slug"])
      : value.type === "number" || value.type === "integer"
        ? new Set(["number"])
        : value.type === "boolean"
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
  if (
    (value.type === "string" ||
      value.type === "number" ||
      value.type === "integer" ||
      value.type === "boolean") &&
    Object.hasOwn(value, "default") &&
    compileSupportedSchema(value, ["properties", key]).safeParse(value.default)
      .success === false
  ) {
    throw new ContentCollectionError(
      `Default for property "${key}" does not satisfy its schema`
    );
  }
  if (value.type === "string") {
    if (declaredControl === "slug" && value.pattern !== collectionSlugPattern) {
      throw new ContentCollectionError(
        `Slug control for property "${key}" must use Webstudio's fixed slug pattern`
      );
    }
    if (value.pattern === collectionSlugPattern && declaredControl !== "slug") {
      throw new ContentCollectionError(
        `Webstudio's fixed slug pattern requires a slug control for property "${key}"`
      );
    }
    const control =
      declaredControl === "text" ||
      declaredControl === "textarea" ||
      declaredControl === "slug"
        ? declaredControl
        : "text";
    return {
      key,
      originalKey: key,
      label,
      type: "string",
      control,
      required,
      minLength: getNonnegativeInteger(value.minLength),
      maxLength: getNonnegativeInteger(value.maxLength),
      defaultValue: value.default,
    };
  }
  if (value.type === "number" || value.type === "integer") {
    return {
      key,
      originalKey: key,
      label,
      type: value.type,
      control: "number",
      required,
      minimum: getFiniteNumber(value.minimum),
      maximum: getFiniteNumber(value.maximum),
      defaultValue: value.default,
    };
  }
  if (value.type === "boolean") {
    return {
      key,
      originalKey: key,
      label,
      type: "boolean",
      control: "checkbox",
      required,
      defaultValue: value.default,
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
  const parser = compileSupportedSchema(schema);
  const settingsResult = collectionSettings.safeParse(schema["x-webstudio"]);
  if (settingsResult.success === false) {
    throw new ContentCollectionError(
      "collection.json must define Webstudio collection settings"
    );
  }
  const settings = settingsResult.data;
  validateTemplatePath(settings.template);
  const required = new Set(schema.required as string[] | undefined);
  const fields = Object.entries(schema.properties).flatMap(([key, field]) => {
    const parsed = getField({ key, value: field, required: required.has(key) });
    return parsed === undefined ? [] : [parsed];
  });
  const slugField = fields.find(({ key }) => key === settings.slugField);
  if (slugField === undefined) {
    throw new ContentCollectionError("Slug field is not defined in properties");
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
  if (slugSourceField === undefined) {
    throw new ContentCollectionError(
      "Slug source field is not defined in properties"
    );
  }
  if (slugSourceField.type !== "string") {
    throw new ContentCollectionError("Slug source field must be a string");
  }
  return {
    schema,
    template: settings.template,
    slugField: settings.slugField,
    generateSlugFrom: settings.generateSlugFrom,
    previewPage: settings.previewPage,
    fields,
    validate: (candidate) => parser.safeParse(candidate),
  };
};

export const normalizeCollectionSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getValidationError = (
  config: ContentCollectionConfig,
  issue: z.core.$ZodIssue
) => {
  const key = typeof issue.path[0] === "string" ? issue.path[0] : undefined;
  const field = config.fields.find((candidate) => candidate.key === key);
  const label = field?.label ?? key ?? "Entry";
  if (issue.code === "too_small" && field?.type === "string") {
    const minimum = Number(issue.minimum);
    return `${label} must contain at least ${minimum} ${
      minimum === 1 ? "character" : "characters"
    }`;
  }
  if (issue.code === "too_big" && field?.type === "string") {
    const maximum = Number(issue.maximum);
    return `${label} must contain at most ${maximum} ${
      maximum === 1 ? "character" : "characters"
    }`;
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
  return getValidationError(config, validation.error.issues[0]);
};

export const getCollectionFieldValidationError = (
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
  const issue = validation.error.issues.find(
    ({ path }) => typeof path[0] === "string" && fieldKeys.has(path[0])
  );
  return issue === undefined ? undefined : getValidationError(config, issue);
};

export const getCollectionTemplateValidationError = (
  config: ContentCollectionConfig,
  properties: Readonly<Record<string, unknown>>
) => {
  const validation = config.validate(properties);
  if (validation.success) {
    return;
  }
  const required = new Set(
    Array.isArray(config.schema.required)
      ? config.schema.required.filter(
          (key): key is string => typeof key === "string"
        )
      : []
  );
  const editable = new Set(config.fields.map(({ key }) => key));
  const issue = validation.error.issues.find(({ code, path }) => {
    if (path.length === 0) {
      return code === "unrecognized_keys";
    }
    const key = typeof path[0] === "string" ? path[0] : undefined;
    if (key === undefined) {
      return false;
    }
    return (
      Object.hasOwn(properties, key) ||
      (required.has(key) && editable.has(key) === false)
    );
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

export const createCollectionEntry = async ({
  config,
  templateSource,
  values,
  existingFilenames,
}: {
  config: ContentCollectionConfig;
  templateSource: string;
  values: Readonly<Record<string, unknown>>;
  existingFilenames: readonly string[];
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
  const currentSlug = frontmatter[config.slugField];
  if (typeof currentSlug !== "string" || currentSlug.trim() === "") {
    const source = frontmatter[config.generateSlugFrom];
    if (typeof source === "string") {
      frontmatter[config.slugField] = normalizeCollectionSlug(source);
    }
  } else {
    frontmatter[config.slugField] = normalizeCollectionSlug(currentSlug);
  }
  const validationError = getCollectionValidationError(config, frontmatter);
  if (validationError !== undefined) {
    throw new ContentCollectionError(validationError);
  }
  const slug = frontmatter[config.slugField];
  if (typeof slug !== "string" || slug === "") {
    throw new ContentCollectionError("Slug cannot be empty");
  }
  const filename = `${slug}.mdx`;
  if (
    existingFilenames.some(
      (existingFilename) =>
        existingFilename.toLowerCase() === filename.toLowerCase()
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
          type: "string",
          minLength: 1,
          maxLength: 120,
        },
        slug: {
          title: "URL slug",
          type: "string",
          minLength: 1,
          maxLength: 120,
          pattern: collectionSlugPattern,
          "x-webstudio": { control: "slug" },
        },
        draft: { title: "Draft", type: "boolean", default: true },
      },
      additionalProperties: false,
      "x-webstudio": {
        template: defaultCollectionTemplateFilename,
        slugField: "slug",
        generateSlugFrom: "title",
      },
    },
    undefined,
    2
  )}\n`;

export const createDefaultCollectionTemplate = () =>
  "---\ndraft: true\n---\n\nStart writing.\n";

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
    "minimum",
    "maximum",
    "default",
  ]) {
    delete result[keyword];
  }
  if (field.minLength !== undefined) {
    result.minLength = field.minLength;
  }
  if (field.maxLength !== undefined) {
    result.maxLength = field.maxLength;
  }
  if (field.minimum !== undefined) {
    result.minimum = field.minimum;
  }
  if (field.maximum !== undefined) {
    result.maximum = field.maximum;
  }
  if (field.defaultValue !== undefined) {
    result.default = field.defaultValue;
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
    result.pattern = collectionSlugPattern;
  }
  return result;
};

const validateCollectionFieldLimits = (field: CollectionField) => {
  if (field.type === "string") {
    for (const [name, value] of [
      ["Minimum length", field.minLength],
      ["Maximum length", field.maxLength],
    ] as const) {
      if (
        value !== undefined &&
        (Number.isInteger(value) === false || value < 0)
      ) {
        throw new ContentCollectionError(
          `${field.label}: ${name} must be a whole number of zero or greater`
        );
      }
    }
    if (
      field.minLength !== undefined &&
      field.maxLength !== undefined &&
      field.minLength > field.maxLength
    ) {
      throw new ContentCollectionError(
        `${field.label}: Minimum length cannot exceed maximum length`
      );
    }
    return;
  }
  if (field.type !== "number" && field.type !== "integer") {
    return;
  }
  for (const [name, value] of [
    ["Minimum", field.minimum],
    ["Maximum", field.maximum],
  ] as const) {
    if (value !== undefined && Number.isFinite(value) === false) {
      throw new ContentCollectionError(
        `${field.label}: ${name} must be a finite number`
      );
    }
  }
  if (
    field.minimum !== undefined &&
    field.maximum !== undefined &&
    field.minimum > field.maximum
  ) {
    throw new ContentCollectionError(
      `${field.label}: Minimum cannot exceed maximum`
    );
  }
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
    previewPage?: string;
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
  const slugField = settings?.slugField ?? config.slugField;
  const generateSlugFrom =
    settings?.generateSlugFrom ?? config.generateSlugFrom;
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
    validateCollectionFieldLimits(field);
  }
  const originalProperties = isObject(config.schema.properties)
    ? config.schema.properties
    : {};
  const editableKeys = new Set(config.fields.map(({ key }) => key));
  const preservedProperties = Object.fromEntries(
    Object.entries(originalProperties).filter(
      ([key]) => editableKeys.has(key) === false
    )
  );
  for (const field of serializedFields) {
    if (Object.hasOwn(preservedProperties, field.key)) {
      throw new ContentCollectionError(
        `Field key "${field.key}" is already used by a schema property that cannot be edited here`
      );
    }
  }
  const nextFieldKeys = new Set(serializedFields.map(({ key }) => key));
  const preservedRequired = Array.isArray(config.schema.required)
    ? config.schema.required.filter(
        (key): key is string =>
          typeof key === "string" &&
          editableKeys.has(key) === false &&
          nextFieldKeys.has(key) === false
      )
    : [];
  const previewPage =
    settings !== undefined && Object.hasOwn(settings, "previewPage")
      ? settings.previewPage
      : config.previewPage;
  const originalSettings = isObject(config.schema["x-webstudio"])
    ? config.schema["x-webstudio"]
    : {};
  const value = {
    ...config.schema,
    required: [
      ...preservedRequired,
      ...serializedFields
        .filter(({ required }) => required)
        .map(({ key }) => key),
    ],
    properties: {
      ...preservedProperties,
      ...Object.fromEntries(
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
    },
    "x-webstudio": {
      ...originalSettings,
      template,
      slugField,
      generateSlugFrom,
      previewPage,
    },
  };
  const source = `${JSON.stringify(value, undefined, 2)}\n`;
  parseCollectionConfig(source);
  return source;
};
