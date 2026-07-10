import { merge as mergeAllOf } from "allof-merge";
import { z } from "zod";
import {
  getInputJsonSchemaMetadata,
  toInputJsonSchemaObject,
  type InputJsonSchema,
  type InputJsonSchemaValue,
  type InputJsonSchemaMetadata,
} from "@webstudio-is/sdk";

export type { InputJsonSchema };

type HiddenInputField = (field: string, description?: string) => boolean;
type InputSchemaOptions = { isHiddenField?: HiddenInputField };

export const runtimeGeneratedIdInputDescription = "runtimeGeneratedIdInput";

export type InputSchemaMetadata = InputJsonSchemaMetadata & {
  inputJsonSchema: InputJsonSchema;
};

type JsonSchema = z.core.JSONSchema.JSONSchema;
type JsonSchemaValue = z.core.JSONSchema._JSONSchema;

const isJsonSchemaObject = (
  schema: JsonSchemaValue | undefined
): schema is JsonSchema => typeof schema === "object" && schema !== null;

const toInputJsonSchema = (schema: JsonSchemaValue): InputJsonSchema => {
  if (schema === true) {
    return {};
  }
  if (schema === false) {
    return { not: {} };
  }
  return schema as unknown as InputJsonSchema;
};

const isEmptyObjectInputJsonSchema = (schema: InputJsonSchema) =>
  schema.type === "object" &&
  Object.keys(schema.properties ?? {}).length === 0 &&
  (schema.required ?? []).length === 0 &&
  (schema.additionalProperties === undefined ||
    schema.additionalProperties === true);

const normalizeGeneratedInputJsonSchemaValue = (
  schema: InputJsonSchemaValue
): InputJsonSchemaValue =>
  typeof schema === "boolean"
    ? schema
    : normalizeGeneratedInputJsonSchema(schema);

// Keep the Zod-generated schema MCP-friendly without fully merging allOf:
// some allOf branches must stay visible so stringified input parsing applies
// every branch.
const normalizeGeneratedInputJsonSchema = (
  schema: InputJsonSchema
): InputJsonSchema => {
  const result: InputJsonSchema = { ...schema };
  if (result.properties !== undefined) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([field, value]) => [
        field,
        normalizeGeneratedInputJsonSchemaValue(value),
      ])
    );
  }
  if (typeof result.additionalProperties === "object") {
    result.additionalProperties = normalizeGeneratedInputJsonSchema(
      result.additionalProperties
    );
  }
  const items = result.items;
  if (typeof items === "object" && Array.isArray(items) === false) {
    result.items = normalizeGeneratedInputJsonSchema(items);
  }
  if (Array.isArray(result.prefixItems)) {
    result.prefixItems = result.prefixItems.map((item) =>
      normalizeGeneratedInputJsonSchemaValue(item)
    );
  }
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    const schemas = result[key];
    if (Array.isArray(schemas)) {
      result[key] = schemas.map((item) =>
        normalizeGeneratedInputJsonSchemaValue(item)
      );
    }
  }
  if (Array.isArray(result.allOf)) {
    const allOf = result.allOf.filter(
      (item) =>
        typeof item === "boolean" ||
        isEmptyObjectInputJsonSchema(item) === false
    );
    if (allOf.length === 0) {
      delete result.allOf;
      return result;
    }
    result.allOf = allOf;
    if (allOf.length === 1) {
      const { allOf: _allOf, ...baseSchema } = result;
      return { ...(toInputJsonSchemaObject(allOf[0]) ?? {}), ...baseSchema };
    }
  }
  if (
    result.type === "object" &&
    Object.keys(result.properties ?? {}).length === 0 &&
    (result.required ?? []).length === 0 &&
    result.additionalProperties === undefined
  ) {
    result.additionalProperties = true;
  }
  return result;
};

export const isRuntimeGeneratedIdInput = (schema: z.ZodTypeAny) =>
  schema.description === runtimeGeneratedIdInputDescription;

export const isHiddenPublicApiInputField: HiddenInputField = (
  field,
  description
) =>
  field === "projectId" ||
  field === "confirm" ||
  description === runtimeGeneratedIdInputDescription;

const removeHiddenJsonSchemaFields = (
  jsonSchema: JsonSchema,
  options: InputSchemaOptions
) => {
  if (jsonSchema.properties === undefined) {
    return;
  }
  for (const [field, fieldSchema] of Object.entries(jsonSchema.properties)) {
    const description = isJsonSchemaObject(fieldSchema)
      ? fieldSchema.description
      : undefined;
    if (options.isHiddenField?.(field, description) === true) {
      delete jsonSchema.properties[field];
    }
  }
  if (jsonSchema.required !== undefined) {
    jsonSchema.required = jsonSchema.required.filter(
      (field) => field in (jsonSchema.properties ?? {})
    );
  }
};

const addTupleBounds = (jsonSchema: JsonSchema) => {
  if (jsonSchema.type !== "array" || jsonSchema.prefixItems === undefined) {
    return;
  }
  jsonSchema.minItems ??= jsonSchema.prefixItems.length;
  if (jsonSchema.items === undefined) {
    jsonSchema.maxItems ??= jsonSchema.prefixItems.length;
  }
};

const setRequiredJsonSchemaFields = (
  zodSchema: z.core.$ZodType,
  jsonSchema: JsonSchema
) => {
  if (zodSchema instanceof z.ZodObject === false) {
    return;
  }
  const required = Object.entries(zodSchema.shape).flatMap(
    ([field, fieldSchema]) => {
      if (jsonSchema.properties?.[field] === undefined) {
        return [];
      }
      return fieldSchema.safeParse(undefined).success ? [] : [field];
    }
  );
  jsonSchema.required = required;
};

const toZodInputJsonSchema = (
  schema: z.ZodTypeAny,
  options: InputSchemaOptions = {}
): InputJsonSchema => {
  const inputJsonSchema = toInputJsonSchema(toZodJsonSchema(schema, options));
  delete inputJsonSchema.$schema;
  return normalizeGeneratedInputJsonSchema(inputJsonSchema);
};

const toZodJsonSchema = (
  schema: z.ZodTypeAny,
  options: InputSchemaOptions = {}
): JsonSchema =>
  z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "input",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      setRequiredJsonSchemaFields(zodSchema, jsonSchema);
      removeHiddenJsonSchemaFields(jsonSchema, options);
      addTupleBounds(jsonSchema);
    },
  });

const getRuntimeGeneratedInputPathsFromJsonSchema = (
  schema: JsonSchemaValue,
  path: string[]
): string[][] => {
  if (isJsonSchemaObject(schema) === false) {
    return [];
  }
  if (schema.description === runtimeGeneratedIdInputDescription) {
    return [path];
  }

  const paths: string[][] = [];
  for (const [field, fieldSchema] of Object.entries(schema.properties ?? {})) {
    paths.push(
      ...getRuntimeGeneratedInputPathsFromJsonSchema(fieldSchema, [
        ...path,
        field,
      ])
    );
  }
  const itemSchemas = [
    ...(schema.prefixItems ?? []),
    ...(Array.isArray(schema.items)
      ? schema.items
      : schema.items === undefined
        ? []
        : [schema.items]),
  ];
  for (const itemSchema of itemSchemas) {
    paths.push(
      ...getRuntimeGeneratedInputPathsFromJsonSchema(itemSchema, [...path, "*"])
    );
  }
  if (isJsonSchemaObject(schema.additionalProperties)) {
    paths.push(
      ...getRuntimeGeneratedInputPathsFromJsonSchema(
        schema.additionalProperties,
        [...path, "*"]
      )
    );
  }
  for (const schemaList of [schema.anyOf, schema.oneOf, schema.allOf]) {
    for (const itemSchema of schemaList ?? []) {
      paths.push(
        ...getRuntimeGeneratedInputPathsFromJsonSchema(itemSchema, path)
      );
    }
  }
  return paths;
};

export const getRuntimeGeneratedInputPaths = (
  schema: z.ZodTypeAny,
  path: string[] = []
): string[][] =>
  getRuntimeGeneratedInputPathsFromJsonSchema(toZodJsonSchema(schema), path);

const mergeAllOfInputJsonSchema = (schema: InputJsonSchema): InputJsonSchema =>
  mergeAllOf(schema, {
    onMergeError: (message, path) => {
      throw new Error(
        `Failed to merge public input JSON schema at ${path.join(".")}: ${message}`
      );
    },
  }) as InputJsonSchema;

const normalizeObjectInputJsonSchema = (
  inputJsonSchema: InputJsonSchema
): InputJsonSchema => {
  if (Object.keys(inputJsonSchema).length === 0) {
    return emptyInputJsonSchema;
  }
  if (inputJsonSchema.type !== "object") {
    return inputJsonSchema;
  }
  const properties = inputJsonSchema.properties ?? {};
  const additionalProperties =
    Object.keys(properties).length === 0
      ? (inputJsonSchema.additionalProperties ?? true)
      : inputJsonSchema.additionalProperties;
  return {
    ...inputJsonSchema,
    properties,
    required: inputJsonSchema.required ?? [],
    ...(additionalProperties === undefined ? {} : { additionalProperties }),
  };
};

const isEmptyPublicInputJsonSchema = (inputJsonSchema: InputJsonSchema) =>
  inputJsonSchema.type === "object" &&
  Object.keys(inputJsonSchema.properties ?? {}).length === 0 &&
  (inputJsonSchema.required ?? []).length === 0 &&
  inputJsonSchema.additionalProperties === true;

const toInputSchemaMetadata = (
  inputJsonSchema: InputJsonSchema
): InputSchemaMetadata => {
  const normalizedInputJsonSchema =
    normalizeObjectInputJsonSchema(inputJsonSchema);
  return {
    ...getInputJsonSchemaMetadata(normalizedInputJsonSchema),
    inputJsonSchema: normalizedInputJsonSchema,
  };
};

export const emptyInputJsonSchema = {
  type: "object",
  additionalProperties: true,
  properties: {},
  required: [],
} as const satisfies InputJsonSchema;

export const emptyInputSchemaMetadata =
  toInputSchemaMetadata(emptyInputJsonSchema);

export const mergeInputSchemaMetadata = (
  left: InputSchemaMetadata,
  right: InputSchemaMetadata
): InputSchemaMetadata => {
  if (isEmptyPublicInputJsonSchema(left.inputJsonSchema)) {
    return right;
  }
  if (isEmptyPublicInputJsonSchema(right.inputJsonSchema)) {
    return left;
  }
  return toInputSchemaMetadata(
    mergeAllOfInputJsonSchema({
      allOf: [left.inputJsonSchema, right.inputJsonSchema],
    })
  );
};

export const getInputSchemaMetadata = (
  schema: z.ZodTypeAny,
  options: InputSchemaOptions = {}
): InputSchemaMetadata =>
  toInputSchemaMetadata(toZodInputJsonSchema(schema, options));
