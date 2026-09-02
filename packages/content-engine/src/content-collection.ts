import { z } from "zod";
import {
  extractMarkdownFrontmatter,
  replaceMarkdownFrontmatter,
} from "./frontmatter";

export const collectionConfigFilename = "collection.json";
export const defaultCollectionTemplateFilename = "template.mdx";

const jsonObject = z.record(z.string(), z.json());
const collectionSettings = z.object({
  template: z.string().min(1),
  slugField: z.string().min(1),
  generateSlugFrom: z.string().min(1),
  previewPage: z.string().min(1).optional(),
});

export type CollectionField = Readonly<{
  key: string;
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
  const label = typeof value.title === "string" ? value.title : key;
  const extension = isObject(value["x-webstudio"])
    ? value["x-webstudio"]
    : undefined;
  const declaredControl = extension?.control;
  if (value.type === "string") {
    const control =
      declaredControl === "textarea" || declaredControl === "slug"
        ? declaredControl
        : "text";
    return {
      key,
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
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new ContentCollectionError("collection.json contains invalid JSON");
  }
  const schemaResult = jsonObject.safeParse(value);
  if (schemaResult.success === false) {
    throw new ContentCollectionError("collection.json must contain an object");
  }
  const schema = schemaResult.data;
  if (schema.type !== "object" || isObject(schema.properties) === false) {
    throw new ContentCollectionError(
      "collection.json must describe an object with properties"
    );
  }
  const settingsResult = collectionSettings.safeParse(schema["x-webstudio"]);
  if (settingsResult.success === false) {
    throw new ContentCollectionError(
      "collection.json must define Webstudio collection settings"
    );
  }
  const settings = settingsResult.data;
  validateTemplatePath(settings.template);
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((key): key is string => typeof key === "string")
      : []
  );
  const fields = Object.entries(schema.properties).flatMap(([key, field]) => {
    const parsed = getField({ key, value: field, required: required.has(key) });
    return parsed === undefined ? [] : [parsed];
  });
  if (fields.some(({ key }) => key === settings.slugField) === false) {
    throw new ContentCollectionError("Slug field is not defined in properties");
  }
  if (fields.some(({ key }) => key === settings.generateSlugFrom) === false) {
    throw new ContentCollectionError(
      "Slug source field is not defined in properties"
    );
  }
  let parser: z.ZodType;
  try {
    parser = z.fromJSONSchema(schema as never);
  } catch {
    throw new ContentCollectionError(
      "collection.json contains an unsupported JSON Schema"
    );
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
    return `${label} must contain at least ${minimum} ${minimum === 1 ? "character" : "characters"}`;
  }
  if (issue.code === "too_big" && field?.type === "string") {
    const maximum = Number(issue.maximum);
    return `${label} must contain at most ${maximum} ${maximum === 1 ? "character" : "characters"}`;
  }
  return `${label}: ${issue.message}`;
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
  const template = await extractMarkdownFrontmatter(
    new TextEncoder().encode(templateSource)
  );
  const frontmatter = { ...template.properties, ...values };
  const currentSlug = frontmatter[config.slugField];
  if (typeof currentSlug !== "string" || currentSlug.trim() === "") {
    const source = frontmatter[config.generateSlugFrom];
    if (typeof source === "string") {
      frontmatter[config.slugField] = normalizeCollectionSlug(source);
    }
  } else {
    frontmatter[config.slugField] = normalizeCollectionSlug(currentSlug);
  }
  const validation = config.validate(frontmatter);
  if (validation.success === false) {
    throw new ContentCollectionError(
      getValidationError(config, validation.error.issues[0])
    );
  }
  const slug = frontmatter[config.slugField];
  if (typeof slug !== "string" || slug === "") {
    throw new ContentCollectionError("Slug cannot be empty");
  }
  const filename = `${slug}.mdx`;
  if (
    existingFilenames.some(
      (existingFilename) =>
        existingFilename.toLocaleLowerCase() === filename.toLocaleLowerCase()
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
      $schema: "https://json-schema.org/draft/2020-12/schema",
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
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
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

const serializeCollectionField = (field: CollectionField) => {
  const result: Record<string, unknown> = {
    title: field.label,
    type: field.type,
  };
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
  if (field.control === "textarea" || field.control === "slug") {
    result["x-webstudio"] = { control: field.control };
  }
  if (field.control === "slug") {
    result.pattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
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
  settings?: { previewPage?: string };
}) => {
  const originalProperties = isObject(config.schema.properties)
    ? config.schema.properties
    : {};
  const editableKeys = new Set(config.fields.map(({ key }) => key));
  const preservedProperties = Object.fromEntries(
    Object.entries(originalProperties).filter(
      ([key]) => editableKeys.has(key) === false
    )
  );
  const preservedRequired = Array.isArray(config.schema.required)
    ? config.schema.required.filter(
        (key): key is string =>
          typeof key === "string" && editableKeys.has(key) === false
      )
    : [];
  const previewPage =
    settings === undefined ? config.previewPage : settings.previewPage;
  const value = {
    ...config.schema,
    required: [
      ...preservedRequired,
      ...fields.filter(({ required }) => required).map(({ key }) => key),
    ],
    properties: {
      ...preservedProperties,
      ...Object.fromEntries(
        fields.map((field) => [field.key, serializeCollectionField(field)])
      ),
    },
    "x-webstudio": {
      template: config.template,
      slugField: config.slugField,
      generateSlugFrom: config.generateSlugFrom,
      ...(previewPage === undefined ? {} : { previewPage }),
    },
  };
  return `${JSON.stringify(value, undefined, 2)}\n`;
};
