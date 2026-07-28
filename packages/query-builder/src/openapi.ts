import { queryDefinition } from "./schema";
import type {
  QueryControl,
  QueryDefinition,
  QueryField,
  QueryFilterControl,
  QueryOperator,
  QueryParameterControlField,
} from "./types";

type JsonObject = Record<string, unknown>;

export type OpenApiQueryConfiguration = {
  definition: QueryDefinition;
  valuePath: string[];
  parameters: { key: string; in: string }[];
};

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const labelFromKey = (key: string) =>
  `${key.slice(0, 1).toUpperCase()}${key.slice(1)}`.replaceAll(
    /([a-z])([A-Z])/g,
    "$1 $2"
  );

const resolvePointer = (document: JsonObject, pointer: string): unknown => {
  if (pointer.startsWith("#/") === false) {
    throw new Error("Only local OpenAPI references are supported");
  }
  let value: unknown = document;
  for (const segment of pointer
    .slice(2)
    .split("/")
    .map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (isObject(value) === false || segment in value === false) {
      throw new Error(`OpenAPI reference ${pointer} is missing`);
    }
    value = value[segment];
  }
  return value;
};

const resolveSchema = (document: JsonObject, value: unknown): JsonObject => {
  if (isObject(value) === false) {
    throw new Error("OpenAPI schema is invalid");
  }
  if (typeof value.$ref !== "string") {
    return value;
  }
  const resolved = resolvePointer(document, value.$ref);
  if (isObject(resolved) === false) {
    throw new Error(`OpenAPI reference ${value.$ref} is not a schema`);
  }
  const { $ref: _ref, ...siblings } = value;
  return resolveSchema(document, { ...resolved, ...siblings });
};

const getProperties = (schema: JsonObject) => {
  if (isObject(schema.properties) === false) {
    throw new Error("OpenAPI object properties are missing");
  }
  return schema.properties;
};

const getChoices = (document: JsonObject, schema: JsonObject) => {
  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.flatMap((item) => {
      const choice = resolveSchema(document, item);
      if (typeof choice.const !== "string") {
        return [];
      }
      return [
        {
          value: choice.const,
          label: typeof choice.title === "string" ? choice.title : choice.const,
        },
      ];
    });
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum.flatMap((value) =>
      typeof value === "string" ? [{ value, label: value }] : []
    );
  }
  return typeof schema.const === "string"
    ? [{ value: schema.const, label: String(schema.title ?? schema.const) }]
    : [];
};

const defaultFromSchema = (schema: JsonObject): unknown => {
  if (schema.default !== undefined) {
    return structuredClone(schema.default);
  }
  if (schema.const !== undefined) {
    return structuredClone(schema.const);
  }
  if (schema.type === "array") {
    return [];
  }
  if (schema.type === "boolean") {
    return false;
  }
  if (schema.type === "integer" || schema.type === "number") {
    if (typeof schema.minimum === "number") {
      return schema.minimum;
    }
    if (typeof schema.exclusiveMinimum === "number") {
      return schema.exclusiveMinimum + 1;
    }
    return 0;
  }
  if (schema.type === "object") {
    const properties = isObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    return Object.fromEntries(
      Object.entries(properties).flatMap(([key, child]) =>
        isObject(child) &&
        (required.includes(key) ||
          child.default !== undefined ||
          child.const !== undefined)
          ? [[key, defaultFromSchema(child)]]
          : []
      )
    );
  }
  return "";
};

const createVariantValidationSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(createVariantValidationSchema);
  }
  if (isObject(value) === false) {
    return value;
  }
  const schema = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      createVariantValidationSchema(item),
    ])
  );
  if (
    schema.type === "array" &&
    Array.isArray(schema.oneOf) &&
    schema.oneOf.every(
      (choice) =>
        isObject(choice) &&
        Array.isArray(choice.const) &&
        choice.const.every((segment) => typeof segment === "string")
    )
  ) {
    // Zod's JSON Schema converter treats an array-valued const as a list of
    // scalar choices. Express each exact array as an equivalent tuple schema
    // so source validation preserves the choices declared by OpenAPI.
    return {
      ...schema,
      oneOf: schema.oneOf.map((choice) => {
        const segments = (choice as { const: string[] }).const;
        return {
          type: "array",
          prefixItems: segments.map((segment) => ({ const: segment })),
          items: false,
          minItems: segments.length,
          maxItems: segments.length,
        };
      }),
    };
  }
  return schema;
};

const createVariantControl = ({
  document,
  key,
  schema,
}: {
  document: JsonObject;
  key: string;
  schema: JsonObject;
}): QueryControl | undefined => {
  if (Array.isArray(schema.oneOf) === false || schema.oneOf.length === 0) {
    return;
  }
  const objects = schema.oneOf.map((item) => resolveSchema(document, item));
  const discriminator = Object.keys(getProperties(objects[0])).find((name) =>
    objects.every((item) => {
      const candidate = getProperties(item)[name];
      return isObject(candidate) && typeof candidate.const === "string";
    })
  );
  if (discriminator === undefined) {
    return;
  }
  const options = objects.map((item) => {
    const properties = getProperties(item);
    const discriminatorSchema = properties[discriminator] as JsonObject;
    const value = discriminatorSchema.const as string;
    const defaultValue = defaultFromSchema(item) as Record<string, unknown>;
    const fields: QueryParameterControlField[] = [];
    for (const [name, child] of Object.entries(properties)) {
      if (name === discriminator || isObject(child) === false) {
        continue;
      }
      if (
        child.type === "array" &&
        isObject(child.items) &&
        Array.isArray(child.items.oneOf)
      ) {
        fields.push({
          key: name,
          label: String(child.title ?? labelFromKey(name)),
          type: "field-list",
          max: typeof child.maxItems === "number" ? child.maxItems : undefined,
        });
        continue;
      }
      if (child.type === "integer" || child.type === "number") {
        fields.push({
          key: name,
          label: String(child.title ?? labelFromKey(name)),
          type: "number",
          min:
            typeof child.minimum === "number"
              ? child.minimum
              : typeof child.exclusiveMinimum === "number"
                ? child.exclusiveMinimum + 1
                : undefined,
          max: typeof child.maximum === "number" ? child.maximum : undefined,
          optional: Array.isArray(item.required)
            ? item.required.includes(name) === false
            : true,
        });
      }
    }
    return {
      value,
      label: String(discriminatorSchema.title ?? value),
      defaultValue,
      fields,
    };
  });
  const currentDefault = isObject(schema.default)
    ? schema.default
    : options[0]?.defaultValue;
  const emptyOption = options[0]?.value;
  if (emptyOption === undefined) {
    return;
  }
  const commonBoolean = Object.keys(getProperties(objects[0])).find(
    (name) =>
      name !== discriminator &&
      objects.every((item) => getProperties(item)[name] !== undefined) &&
      objects.every((item) => {
        const child = getProperties(item)[name];
        return isObject(child) && child.type === "boolean";
      })
  );
  return {
    type: "variant",
    key,
    label: String(schema.title ?? labelFromKey(key)),
    defaultValue: currentDefault ?? options[0]?.defaultValue ?? {},
    schema: createVariantValidationSchema(schema) as JsonObject,
    config: {
      discriminator,
      selection: {
        label: "Output",
        emptyOption,
        baseline:
          commonBoolean === undefined
            ? undefined
            : {
                key: commonBoolean,
                label: String(
                  (getProperties(objects[0])[commonBoolean] as JsonObject)
                    .title ?? labelFromKey(commonBoolean)
                ),
              },
      },
      options,
    },
  };
};

const createDefinition = ({
  document,
  schema,
}: {
  document: JsonObject;
  schema: JsonObject;
}): QueryDefinition => {
  const fields = new Map<string, QueryField>();
  const operators = new Map<string, QueryOperator>();
  const controls: QueryControl[] = [];
  for (const [key, unresolved] of Object.entries(getProperties(schema))) {
    const property = resolveSchema(document, unresolved);
    const label = String(property.title ?? labelFromKey(key));
    const resolved = resolveSchema(document, property);
    const anyOf = Array.isArray(resolved.anyOf) ? resolved.anyOf : [];
    const conditionUnion = anyOf
      .map((item) => resolveSchema(document, item))
      .find((item) => Array.isArray(item.oneOf));
    if (conditionUnion !== undefined && Array.isArray(conditionUnion.oneOf)) {
      for (const item of conditionUnion.oneOf) {
        const condition = resolveSchema(document, item);
        const properties = getProperties(condition);
        const field = isObject(properties.field) ? properties.field : {};
        const operator = isObject(properties.operator)
          ? properties.operator
          : {};
        if (Array.isArray(field.const) === false) {
          continue;
        }
        const fieldKey = JSON.stringify(field.const);
        const supported = getChoices(document, operator);
        const existing = fields.get(fieldKey);
        fields.set(fieldKey, {
          path: field.const as string[],
          label: String(field.title ?? (field.const as string[]).join(" / ")),
          types: ["string"],
          operators: [
            ...new Set([
              ...(existing?.operators ?? []),
              ...supported.map(({ value }) => value),
            ]),
          ],
        });
        const valueSchema = isObject(properties.value) ? properties.value : {};
        for (const choice of supported) {
          operators.set(choice.value, {
            value: choice.value,
            label: choice.label,
            types: ["string"],
            input: {
              control: valueSchema.type === "boolean" ? "none" : "expression",
              defaultValue: JSON.stringify(defaultFromSchema(valueSchema)),
            },
          });
        }
      }
      const combinators: ("all" | "any")[] = anyOf.flatMap((item) => {
        const candidate = resolveSchema(document, item);
        if (isObject(candidate.properties) === false) {
          return [];
        }
        const names = Object.keys(candidate.properties);
        return names.length === 1 && (names[0] === "all" || names[0] === "any")
          ? [names[0] as "all" | "any"]
          : [];
      });
      const firstField = fields.values().next().value;
      const firstOperator = firstField?.operators?.[0];
      if (firstField !== undefined && firstOperator !== undefined) {
        controls.push({
          type: "filter",
          key,
          label,
          defaultValue: (property.default ?? {
            [combinators[0] ?? "all"]: [],
          }) as QueryFilterControl["defaultValue"],
          combinators: combinators.length > 0 ? combinators : ["all"],
          limits: { conditions: 100, depth: 20 },
          defaultCondition: { field: firstField.path, operator: firstOperator },
        });
      }
      continue;
    }
    if (property.type === "array" && isObject(property.items)) {
      const item = resolveSchema(document, property.items);
      const itemProperties = isObject(item.properties) ? item.properties : {};
      const field = isObject(itemProperties.field) ? itemProperties.field : {};
      const directions = isObject(itemProperties.direction)
        ? getChoices(
            document,
            resolveSchema(document, itemProperties.direction)
          )
        : [];
      const fieldChoices = Array.isArray(field.oneOf)
        ? field.oneOf.flatMap((choice) => {
            if (
              isObject(choice) === false ||
              Array.isArray(choice.const) === false
            ) {
              return [];
            }
            return [choice.const as string[]];
          })
        : [];
      if (fieldChoices.length > 0 && directions.length > 0) {
        controls.push({
          type: "sort",
          key,
          label,
          defaultValue: Array.isArray(property.default)
            ? (property.default as never[])
            : [],
          defaultItem: {
            field: fieldChoices[0],
            direction: directions[0].value === "desc" ? "desc" : "asc",
          },
          max: typeof property.maxItems === "number" ? property.maxItems : 100,
        });
        continue;
      }
    }
    if (property.type === "integer" || property.type === "number") {
      controls.push({
        type: "expression",
        key,
        label,
        defaultValue: JSON.stringify(defaultFromSchema(property)),
        input: "number",
        min:
          typeof property.minimum === "number" ? property.minimum : undefined,
        max:
          typeof property.maximum === "number" ? property.maximum : undefined,
      });
      continue;
    }
    const variant = createVariantControl({ document, key, schema: property });
    if (variant !== undefined) {
      controls.push(variant);
    }
  }
  return queryDefinition.parse({
    version: 1,
    fields: [...fields.values()],
    operators: [...operators.values()],
    source: { fieldPathSchema: true, controls },
  });
};

const findOperation = (document: JsonObject, operationId: string) => {
  if (isObject(document.paths) === false) {
    throw new Error("OpenAPI paths are missing");
  }
  for (const pathItem of Object.values(document.paths)) {
    if (isObject(pathItem) === false) {
      continue;
    }
    for (const candidate of Object.values(pathItem)) {
      if (isObject(candidate) && candidate.operationId === operationId) {
        return candidate;
      }
    }
  }
  throw new Error(`OpenAPI operation ${operationId} is missing`);
};

/** Derives query authoring solely from one standard OpenAPI operation. */
export const getOpenApiQueryConfiguration = ({
  document: input,
  operationId,
}: {
  document: unknown;
  operationId: string;
}): OpenApiQueryConfiguration => {
  if (isObject(input) === false) {
    throw new Error("OpenAPI document is invalid");
  }
  const operation = findOperation(input, operationId);
  const parameters = Array.isArray(operation.parameters)
    ? operation.parameters.flatMap((item) => {
        const parameter = resolveSchema(input, item);
        if (
          typeof parameter.name !== "string" ||
          typeof parameter.in !== "string" ||
          isObject(parameter.schema) === false
        ) {
          return [];
        }
        return [
          {
            key: parameter.name,
            in: parameter.in,
            schema: resolveSchema(input, parameter.schema),
          },
        ];
      })
    : [];
  const requestBody = isObject(operation.requestBody)
    ? resolveSchema(input, operation.requestBody)
    : undefined;
  const content =
    requestBody && isObject(requestBody.content)
      ? requestBody.content
      : undefined;
  const media =
    content && isObject(content["application/json"])
      ? content["application/json"]
      : undefined;
  if (media !== undefined && isObject(media.schema)) {
    const requestSchema = resolveSchema(input, media.schema);
    const required = Array.isArray(requestSchema.required)
      ? requestSchema.required.filter(
          (item): item is string => typeof item === "string"
        )
      : [];
    const properties = getProperties(requestSchema);
    const objectKeys = required.filter((key) => {
      const property = properties[key];
      return (
        isObject(property) && resolveSchema(input, property).type === "object"
      );
    });
    const valuePath = objectKeys.length === 1 ? [objectKeys[0]] : [];
    const valueSchema =
      valuePath.length === 1
        ? resolveSchema(input, properties[valuePath[0]])
        : requestSchema;
    return {
      definition: createDefinition({ document: input, schema: valueSchema }),
      valuePath,
      parameters: parameters.map(({ key, in: location }) => ({
        key,
        in: location,
      })),
    };
  }
  const controls: QueryControl[] = parameters.map(({ key, schema }) => ({
    type: "expression",
    key,
    label: String(schema.title ?? labelFromKey(key)),
    defaultValue: JSON.stringify(defaultFromSchema(schema)),
    input:
      schema.type === "integer" || schema.type === "number"
        ? "number"
        : "expression",
    min: typeof schema.minimum === "number" ? schema.minimum : undefined,
    max: typeof schema.maximum === "number" ? schema.maximum : undefined,
  }));
  return {
    definition: queryDefinition.parse({
      version: 1,
      fields: [],
      operators: [],
      source: { fieldPathSchema: true, controls },
    }),
    valuePath: [],
    parameters: parameters.map(({ key, in: location }) => ({
      key,
      in: location,
    })),
  };
};
