import { z } from "zod";
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
// Each segment starts with a letter or number. Marks stay attached to preserve
// scripts such as Hindi; uppercase letters, separators and symbols are excluded.
const collectionSlugPattern =
  "^(?!.*[\\p{Lu}\\p{Lt}])[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:-[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*$(?![\\s\\S])";
const collectionSlugPatterns = new Map([
  [legacyCollectionSlugPattern, new RegExp(legacyCollectionSlugPattern)],
  [collectionSlugPattern, new RegExp(collectionSlugPattern, "u")],
]);
const collectionSchemaDialect = "https://json-schema.org/draft/2020-12/schema";
const maximumPropertyKeyBytes = 256;
export const defaultCollectionTemplateFilename = "template.mdx";

const collectionSettings = z.object({
  template: z.string().min(1),
  slugField: z.string().min(1).optional(),
  generateSlugFrom: z.string().min(1).optional(),
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
}>;

export type ContentCollectionConfig = Readonly<{
  schema: Record<string, unknown>;
  template: string;
  slugField?: string;
  generateSlugFrom?: string;
  fields: readonly CollectionField[];
  validate: (value: unknown) => z.ZodSafeParseResult<unknown>;
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
  Record<CollectionFieldType, ReadonlySet<string>>
> = {
  string: new Set(["minLength", "maxLength", "pattern"]),
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

const compileFieldSchema = (
  schema: Readonly<Record<string, unknown>>,
  path: readonly string[]
): z.ZodType => {
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
    if (Object.hasOwn(schema, "pattern")) {
      if (
        typeof schema.pattern !== "string" ||
        !collectionSlugPatterns.has(schema.pattern)
      ) {
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
        typeof schema.pattern === "string" &&
        collectionSlugPatterns.get(schema.pattern)?.test(value) === false
      ) {
        context.addIssue({
          input: value,
          code: "invalid_format",
          format: "regex",
          pattern: schema.pattern,
          message: `Invalid string: must match pattern ${schema.pattern}`,
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

  return z.boolean();
};

const compileCollectionSchema = (
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
  const required = getRequiredPropertyKeys({ schema, properties, path: [] });
  const shape: Record<string, z.ZodType> = {};
  for (const [key, propertySchema] of Object.entries(properties)) {
    validatePropertyKey(key);
    if (isObject(propertySchema) === false) {
      throw new ContentCollectionError(
        `Property "${key}" must contain a schema object`
      );
    }
    const parser = compileFieldSchema(propertySchema, ["properties", key]);
    shape[key] = required.has(key) ? parser : parser.optional();
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
  if (value.type === "string") {
    const hasSlugPattern =
      typeof value.pattern === "string" &&
      collectionSlugPatterns.has(value.pattern);
    if (declaredControl === "slug" && !hasSlugPattern) {
      throw new ContentCollectionError(
        `Slug control for property "${key}" must use Webstudio's fixed slug pattern`
      );
    }
    if (hasSlugPattern && declaredControl !== "slug") {
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
  const parser = compileCollectionSchema(schema, schema.properties);
  const settingsResult = collectionSettings.safeParse(schema["x-webstudio"]);
  if (settingsResult.success === false) {
    throw new ContentCollectionError(
      "collection.json must define Webstudio collection settings"
    );
  }
  const settings = settingsResult.data;
  validateTemplatePath(settings.template);
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
    slugField: settings.slugField,
    generateSlugFrom: settings.generateSlugFrom,
    fields,
    validate: (candidate) => parser.safeParse(candidate),
  };
};

export const normalizeCollectionSlug = (
  value: string,
  config?: ContentCollectionConfig
) => {
  const properties = config?.schema.properties;
  const field =
    config?.slugField !== undefined && isObject(properties)
      ? properties[config.slugField]
      : undefined;
  if (isObject(field) && field.pattern === legacyCollectionSlugPattern) {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return (
    value
      .normalize("NFC")
      .toLowerCase()
      .normalize("NFC")
      .match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)
      ?.join("-") ?? ""
  );
};

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
  const issue = validation.error.issues.find(
    ({ path }) => typeof path[0] === "string" && fieldKeys.has(path[0])
  );
  if (issue === undefined || typeof issue.path[0] !== "string") {
    return;
  }
  return {
    fieldKey: issue.path[0],
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
  const issue = validation.error.issues.find(({ code, path }) => {
    if (path.length === 0) {
      return code === "unrecognized_keys";
    }
    const key = typeof path[0] === "string" ? path[0] : undefined;
    if (key === undefined) {
      return false;
    }
    return Object.hasOwn(properties, key);
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
}: {
  files: readonly ContentCollectionFile<File>[];
  readSource: (file: ContentCollectionFile<File>) => Promise<string>;
  readFrontmatter?: (
    file: ContentCollectionFile<File>
  ) => Promise<Readonly<Record<string, unknown>>>;
  validateTemplate?: boolean;
  validateEntries?: boolean;
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
  const forbiddenFile = files.find(
    (file) => file.id !== configFile.id && file.isMdx === false
  );
  if (forbiddenFile !== undefined) {
    throw new ContentCollectionInspectionError(
      `Move "${forbiddenFile.filename}" into a subfolder`,
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
  for (const file of files) {
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
  const entryFiles = files.filter(
    (file) => file.id !== configFile.id && file.id !== templateFile.id
  );
  if (validateEntries) {
    for (let index = 0; index < entryFiles.length; index += 1) {
      const entryFile = entryFiles[index];
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
        frontmatter[config.slugField] = normalizeCollectionSlug(source, config);
      }
    } else {
      frontmatter[config.slugField] = normalizeCollectionSlug(
        currentSlug,
        config
      );
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
        draft: { title: "Draft", type: "boolean" },
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
    result.pattern =
      typeof original.pattern === "string" &&
      collectionSlugPatterns.has(original.pattern)
        ? original.pattern
        : collectionSlugPattern;
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
    },
  };
  const source = `${JSON.stringify(value, undefined, 2)}\n`;
  parseCollectionConfig(source);
  return source;
};
