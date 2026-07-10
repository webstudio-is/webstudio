import type { JSONSchema } from "json-schema-typed";

export type InputJsonSchema = JSONSchema.Interface;
export type InputJsonSchemaValue = JSONSchema;

export type InputJsonSchemaMetadata = {
  inputFields: readonly string[];
  requiredInputFields: readonly string[];
  inputFieldTypes: Partial<Record<string, "array">>;
};

const unique = (values: readonly string[]) => [...new Set(values)];

export const toInputJsonSchemaObject = (
  schema: InputJsonSchemaValue | undefined
): InputJsonSchema | undefined => {
  if (schema === undefined) {
    return;
  }
  if (schema === true) {
    return {};
  }
  if (schema === false) {
    return { not: {} };
  }
  return schema;
};

const annotationInputJsonSchemaFields = new Set(["description", "default"]);

const isUnconstrainedInputJsonSchema = (schema: InputJsonSchema) =>
  Object.entries(schema).every(
    ([field, value]) =>
      value === undefined || annotationInputJsonSchemaFields.has(field)
  );

export const inputJsonSchemaAcceptsType = (
  schema: InputJsonSchema,
  type: string,
  options: { treatUnconstrainedAsAny?: boolean } = {}
): boolean => {
  if (
    options.treatUnconstrainedAsAny === true &&
    isUnconstrainedInputJsonSchema(schema)
  ) {
    return true;
  }
  const schemaObject = toInputJsonSchemaObject(schema);
  if (schemaObject === undefined) {
    return false;
  }
  const types =
    schemaObject.type === undefined
      ? []
      : Array.isArray(schemaObject.type)
        ? schemaObject.type
        : [schemaObject.type];
  if ((types as readonly string[]).includes(type)) {
    return true;
  }
  if (
    type === "object" &&
    (schemaObject.properties !== undefined ||
      schemaObject.required !== undefined ||
      schemaObject.additionalProperties !== undefined)
  ) {
    return true;
  }
  if (
    type === "array" &&
    (schemaObject.items !== undefined ||
      schemaObject.prefixItems !== undefined ||
      schemaObject.minItems !== undefined ||
      schemaObject.maxItems !== undefined)
  ) {
    return true;
  }
  for (const combinator of ["anyOf", "oneOf"] as const) {
    if (schemaObject[combinator] !== undefined) {
      return schemaObject[combinator].some((item) => {
        const itemSchema = toInputJsonSchemaObject(item);
        return itemSchema === undefined
          ? false
          : inputJsonSchemaAcceptsType(itemSchema, type, options);
      });
    }
  }
  if (schemaObject.allOf !== undefined) {
    return (
      schemaObject.allOf.length > 0 &&
      schemaObject.allOf.every((item) => {
        const itemSchema = toInputJsonSchemaObject(item);
        return itemSchema === undefined
          ? false
          : inputJsonSchemaAcceptsType(itemSchema, type, options);
      })
    );
  }
  return false;
};

const combineInputJsonSchemas = (
  left: InputJsonSchema,
  right: InputJsonSchema,
  combinator: "anyOf" | "oneOf" | "allOf"
): InputJsonSchema => ({ [combinator]: [left, right] });

const inputJsonSchemaCombinators = ["anyOf", "oneOf", "allOf"] as const;

const collectInputJsonSchemaBranchValue = <Value>(
  schema: InputJsonSchema | undefined,
  readValue: (schema: InputJsonSchema | undefined) => Value | undefined,
  combineValues: (
    left: Value,
    right: Value,
    combinator: (typeof inputJsonSchemaCombinators)[number]
  ) => Value
): Value | undefined => {
  let value = readValue(schema);
  for (const combinator of inputJsonSchemaCombinators) {
    for (const item of schema?.[combinator] ?? []) {
      const itemSchema = toInputJsonSchemaObject(item);
      const itemValue = collectInputJsonSchemaBranchValue(
        itemSchema,
        readValue,
        combineValues
      );
      if (itemValue !== undefined) {
        value =
          value === undefined
            ? itemValue
            : combineValues(value, itemValue, combinator);
      }
    }
  }
  return value;
};

const mergeInputJsonSchemaProperties = (
  left: Record<string, InputJsonSchema>,
  right: Record<string, InputJsonSchema>,
  combinator: "anyOf" | "oneOf" | "allOf"
) => {
  const result = { ...left };
  for (const [field, schema] of Object.entries(right)) {
    const current = result[field];
    result[field] =
      current === undefined
        ? schema
        : combineInputJsonSchemas(current, schema, combinator);
  }
  return result;
};

export const getInputJsonSchemaProperties = (
  schema: InputJsonSchema | undefined
): Record<string, InputJsonSchema> | undefined =>
  collectInputJsonSchemaBranchValue(
    schema,
    (schema) => {
      const properties = Object.entries(schema?.properties ?? {}).flatMap(
        ([field, value]) => {
          const valueSchema = toInputJsonSchemaObject(value);
          return valueSchema === undefined ? [] : [[field, valueSchema]];
        }
      );
      return properties.length === 0
        ? undefined
        : Object.fromEntries(properties);
    },
    mergeInputJsonSchemaProperties
  );

export const getInputJsonSchemaAdditionalProperties = (
  schema: InputJsonSchema | undefined
): InputJsonSchema | undefined =>
  collectInputJsonSchemaBranchValue(
    schema,
    (schema) =>
      typeof schema?.additionalProperties === "object"
        ? schema.additionalProperties
        : schema?.additionalProperties === true
          ? {}
          : undefined,
    combineInputJsonSchemas
  );

const intersectStrings = (left: readonly string[], right: readonly string[]) =>
  left.filter((value) => right.includes(value));

const getInputJsonSchemaRequiredFields = (
  schema: InputJsonSchema | undefined
): readonly string[] => {
  if (schema === undefined) {
    return [];
  }
  const allOfRequired = schema.allOf
    ?.map(toInputJsonSchemaObject)
    .filter((schema) => schema !== undefined)
    .flatMap(getInputJsonSchemaRequiredFields);
  const anyBranchSchemas = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]
    .map(toInputJsonSchemaObject)
    .filter((schema) => schema !== undefined);
  const anyOfRequired =
    anyBranchSchemas.length === 0
      ? undefined
      : anyBranchSchemas
          .map(getInputJsonSchemaRequiredFields)
          .reduce(intersectStrings);

  return unique([
    ...(schema.required ?? []),
    ...(allOfRequired ?? []),
    ...(anyOfRequired ?? []),
  ]);
};

export const getInputJsonSchemaMetadata = (
  inputSchema: InputJsonSchema
): InputJsonSchemaMetadata => {
  const properties = getInputJsonSchemaProperties(inputSchema) ?? {};
  return {
    inputFields: Object.keys(properties),
    requiredInputFields: getInputJsonSchemaRequiredFields(inputSchema).filter(
      (field) => field in properties
    ),
    inputFieldTypes: Object.fromEntries(
      Object.entries(properties).flatMap(([field, schema]) =>
        inputJsonSchemaAcceptsType(schema, "array") ? [[field, "array"]] : []
      )
    ),
  };
};
