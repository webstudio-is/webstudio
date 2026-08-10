import { queryDefinition } from "./schema";
import type {
  QueryControl,
  QueryDefinition,
  QueryField,
  QueryFilterControl,
  QueryOperator,
  QueryParameterControlField,
  QuerySelectControl,
} from "./types";
import { getQueryFieldKey } from "./runtime";

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const labelFromKey = (key: string) =>
  `${key.slice(0, 1).toUpperCase()}${key.slice(1)}`.replaceAll(
    /([a-z])([A-Z])/g,
    "$1 $2"
  );

const resolvePointer = (document: JsonObject, pointer: string): unknown => {
  if (pointer.startsWith("#") === false) {
    throw new Error("Only local OpenAPI references are supported");
  }
  const fragment = decodeURIComponent(pointer.slice(1));
  if (fragment === "") {
    return document;
  }
  if (fragment.startsWith("/") === false) {
    throw new Error("Only local OpenAPI references are supported");
  }
  // JSON Pointer packages commonly traverse inherited properties. Decode the
  // small RFC 6901 grammar here so untrusted schemas can only address own JSON
  // properties. URI fragment decoding happens before token separation.
  let value: unknown = document;
  for (const segment of fragment
    .slice(1)
    .split("/")
    .map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (Array.isArray(value)) {
      if (/^(0|[1-9][0-9]*)$/.test(segment) === false) {
        throw new Error(`OpenAPI reference ${pointer} is missing`);
      }
      const index = Number(segment);
      if (Number.isSafeInteger(index) === false || index >= value.length) {
        throw new Error(`OpenAPI reference ${pointer} is missing`);
      }
      value = value[index];
      continue;
    }
    if (isObject(value) === false || Object.hasOwn(value, segment) === false) {
      throw new Error(`OpenAPI reference ${pointer} is missing`);
    }
    value = value[segment];
  }
  return value;
};

const resolveSchema = (
  document: JsonObject,
  value: unknown,
  references = new Set<string>()
): JsonObject => {
  if (isObject(value) === false) {
    throw new Error("OpenAPI schema is invalid");
  }
  if (typeof value.$ref !== "string") {
    return value;
  }
  if (references.has(value.$ref)) {
    throw new Error("Circular OpenAPI query schema references are unsupported");
  }
  const resolved = resolvePointer(document, value.$ref);
  if (isObject(resolved) === false) {
    throw new Error(`OpenAPI reference ${value.$ref} is not a schema`);
  }
  const { $ref: _ref, ...siblings } = value;
  return resolveSchema(
    document,
    { ...resolved, ...siblings },
    new Set([...references, value.$ref])
  );
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

const getFieldChoices = (
  document: JsonObject,
  schema: JsonObject
): Array<{ path: string[]; label: string }> => {
  const resolved = resolveSchema(document, schema);
  if (
    Array.isArray(resolved.const) &&
    resolved.const.every((segment) => typeof segment === "string")
  ) {
    return [
      {
        path: resolved.const,
        label:
          typeof resolved.title === "string"
            ? resolved.title
            : resolved.const.join(" / "),
      },
    ];
  }
  if (
    Array.isArray(resolved.enum) &&
    resolved.enum.every(
      (value) =>
        Array.isArray(value) &&
        value.every((segment) => typeof segment === "string")
    )
  ) {
    return resolved.enum.map((value) => ({
      path: value as string[],
      label: (value as string[]).join(" / "),
    }));
  }
  const choices = Array.isArray(resolved.oneOf)
    ? resolved.oneOf
    : Array.isArray(resolved.anyOf)
      ? resolved.anyOf
      : undefined;
  return choices === undefined
    ? []
    : choices.flatMap((choice) =>
        isObject(choice) ? getFieldChoices(document, choice) : []
      );
};

const getSchemaChoices = (document: JsonObject, schema: JsonObject) => {
  const resolved = resolveSchema(document, schema);
  const choices = Array.isArray(resolved.oneOf)
    ? resolved.oneOf
    : Array.isArray(resolved.anyOf)
      ? resolved.anyOf
      : [];
  return choices.flatMap((choice) =>
    isObject(choice) ? [resolveSchema(document, choice)] : []
  );
};

const isFilterCondition = (schema: JsonObject) => {
  if (isObject(schema.properties) === false) {
    return false;
  }
  return (
    "field" in schema.properties &&
    "operator" in schema.properties &&
    "value" in schema.properties
  );
};

const getFilterSchema = (document: JsonObject, schema: JsonObject) => {
  const choices = getSchemaChoices(document, schema);
  const conditionUnion = choices.find((choice) => {
    const conditions = getSchemaChoices(document, choice);
    return conditions.length > 0 && conditions.every(isFilterCondition);
  });
  if (conditionUnion === undefined) {
    return;
  }
  const groups = choices.flatMap((choice) => {
    if (isObject(choice.properties) === false) {
      return [];
    }
    const names = Object.keys(choice.properties);
    if (names.length !== 1 || (names[0] !== "all" && names[0] !== "any")) {
      return [];
    }
    const children = choice.properties[names[0]];
    return isObject(children) && isObject(children.items)
      ? [{ combinator: names[0] as "all" | "any", children }]
      : [];
  });
  return { conditionUnion, groups };
};

const getFilterDepth = (
  document: JsonObject,
  input: JsonObject,
  references = new Set<string>()
): number | undefined => {
  let schema = input;
  let nextReferences = references;
  if (typeof schema.$ref === "string") {
    if (references.has(schema.$ref)) {
      return;
    }
    const resolved = resolvePointer(document, schema.$ref);
    if (isObject(resolved) === false) {
      return;
    }
    const { $ref, ...siblings } = schema;
    schema = { ...resolved, ...siblings };
    nextReferences = new Set([...references, $ref]);
  }
  const filter = getFilterSchema(document, schema);
  if (filter === undefined || filter.groups.length === 0) {
    return 0;
  }
  const childDepths = filter.groups.map(({ children }) =>
    getFilterDepth(document, children.items as JsonObject, nextReferences)
  );
  if (childDepths.some((depth) => depth === undefined)) {
    return;
  }
  return 1 + Math.max(...(childDepths as number[]));
};

type NumberControlConstraints = {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  integer?: boolean;
};

const getNumberControlConstraints = (
  schema: JsonObject
): NumberControlConstraints => {
  const integer = schema.type === "integer";
  const minimum =
    typeof schema.minimum === "number" ? schema.minimum : undefined;
  const exclusiveMinimum =
    typeof schema.exclusiveMinimum === "number"
      ? schema.exclusiveMinimum
      : schema.exclusiveMinimum === true
        ? minimum
        : undefined;
  const maximum =
    typeof schema.maximum === "number" ? schema.maximum : undefined;
  const exclusiveMaximum =
    typeof schema.exclusiveMaximum === "number"
      ? schema.exclusiveMaximum
      : schema.exclusiveMaximum === true
        ? maximum
        : undefined;
  if (integer) {
    const minimums = [
      minimum === undefined ? undefined : Math.ceil(minimum),
      exclusiveMinimum === undefined
        ? undefined
        : Math.floor(exclusiveMinimum) + 1,
    ].filter((value): value is number => value !== undefined);
    const maximums = [
      maximum === undefined ? undefined : Math.floor(maximum),
      exclusiveMaximum === undefined
        ? undefined
        : Math.ceil(exclusiveMaximum) - 1,
    ].filter((value): value is number => value !== undefined);
    return {
      min: minimums.length === 0 ? undefined : Math.max(...minimums),
      max: maximums.length === 0 ? undefined : Math.min(...maximums),
      integer: true as const,
    };
  }
  const exclusiveMin =
    exclusiveMinimum !== undefined &&
    (minimum === undefined || exclusiveMinimum >= minimum);
  const exclusiveMax =
    exclusiveMaximum !== undefined &&
    (maximum === undefined || exclusiveMaximum <= maximum);
  return {
    min: exclusiveMin ? exclusiveMinimum : minimum,
    max: exclusiveMax ? exclusiveMaximum : maximum,
    ...(exclusiveMin ? { exclusiveMin: true as const } : {}),
    ...(exclusiveMax ? { exclusiveMax: true as const } : {}),
  };
};

const isWithinNumberConstraints = (
  value: number,
  constraints: ReturnType<typeof getNumberControlConstraints>
) =>
  (constraints.integer !== true || Number.isInteger(value)) &&
  (constraints.min === undefined ||
    (constraints.exclusiveMin
      ? value > constraints.min
      : value >= constraints.min)) &&
  (constraints.max === undefined ||
    (constraints.exclusiveMax
      ? value < constraints.max
      : value <= constraints.max));

const getDefaultNumber = (schema: JsonObject) => {
  const constraints = getNumberControlConstraints(schema);
  const candidates = [
    0,
    constraints.min,
    constraints.max,
    constraints.min === undefined
      ? undefined
      : constraints.max === undefined
        ? constraints.min + 1
        : constraints.min + (constraints.max - constraints.min) / 2,
    constraints.max === undefined ? undefined : constraints.max - 1,
  ];
  return (
    candidates.find(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        isWithinNumberConstraints(value, constraints)
    ) ?? 0
  );
};

const defaultFromSchema = (
  document: JsonObject,
  input: JsonObject
): unknown => {
  const schema = resolveSchema(document, input);
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
    return getDefaultNumber(schema);
  }
  if (schema.type === "object") {
    const properties = isObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    return Object.fromEntries(
      Object.entries(properties).flatMap(([key, child]) => {
        if (isObject(child) === false) {
          return [];
        }
        const resolved = resolveSchema(document, child);
        return required.includes(key) ||
          resolved.default !== undefined ||
          resolved.const !== undefined
          ? [[key, defaultFromSchema(document, resolved)]]
          : [];
      })
    );
  }
  return "";
};

const createVariantValidationSchema = (
  document: JsonObject,
  value: unknown,
  references = new Set<string>()
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      createVariantValidationSchema(document, item, references)
    );
  }
  if (isObject(value) === false) {
    return value;
  }
  if (typeof value.$ref === "string") {
    if (references.has(value.$ref)) {
      throw new Error(
        "Circular OpenAPI query schema references are unsupported"
      );
    }
    const resolved = resolvePointer(document, value.$ref);
    if (isObject(resolved) === false) {
      throw new Error(`OpenAPI reference ${value.$ref} is not a schema`);
    }
    const { $ref, ...siblings } = value;
    return createVariantValidationSchema(
      document,
      { ...resolved, ...siblings },
      new Set([...references, $ref])
    );
  }
  const schema = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      createVariantValidationSchema(document, item, references),
    ])
  );
  if (
    schema.type === "array" &&
    Array.isArray(schema.oneOf) &&
    schema.oneOf.every((choice) => {
      if (isObject(choice) === false) {
        return false;
      }
      const values = Array.isArray(choice.enum) ? choice.enum : [choice.const];
      return values.every(
        (segments) =>
          Array.isArray(segments) &&
          segments.every((segment) => typeof segment === "string")
      );
    })
  ) {
    // Zod's JSON Schema converter treats an array-valued const as a list of
    // scalar choices. Express each exact array as an equivalent tuple schema
    // so source validation preserves the choices declared by OpenAPI.
    return {
      ...schema,
      oneOf: schema.oneOf.flatMap((choice) => {
        const values = Array.isArray((choice as JsonObject).enum)
          ? ((choice as JsonObject).enum as string[][])
          : [(choice as { const: string[] }).const];
        return values.map((segments) => ({
          type: "array",
          prefixItems: segments.map((segment) => ({ const: segment })),
          items: false,
          minItems: segments.length,
          maxItems: segments.length,
        }));
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
      return (
        isObject(candidate) &&
        typeof resolveSchema(document, candidate).const === "string"
      );
    })
  );
  if (discriminator === undefined) {
    return;
  }
  const options = objects.map((item) => {
    const properties = getProperties(item);
    const discriminatorSchema = resolveSchema(
      document,
      properties[discriminator]
    );
    const value = discriminatorSchema.const as string;
    const defaultValue = defaultFromSchema(document, item) as Record<
      string,
      unknown
    >;
    const fields: QueryParameterControlField[] = [];
    for (const [name, child] of Object.entries(properties)) {
      if (name === discriminator || isObject(child) === false) {
        continue;
      }
      const childSchema = resolveSchema(document, child);
      const items = isObject(childSchema.items)
        ? resolveSchema(document, childSchema.items)
        : undefined;
      if (
        childSchema.type === "array" &&
        items !== undefined &&
        getFieldChoices(document, items).length > 0
      ) {
        fields.push({
          key: name,
          label: String(childSchema.title ?? labelFromKey(name)),
          type: "field-list",
          max:
            typeof childSchema.maxItems === "number"
              ? childSchema.maxItems
              : undefined,
        });
        continue;
      }
      if (childSchema.type === "integer" || childSchema.type === "number") {
        fields.push({
          key: name,
          label: String(childSchema.title ?? labelFromKey(name)),
          type: "number",
          ...getNumberControlConstraints(childSchema),
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
  if (options.length === 0) {
    return;
  }
  const commonBoolean = Object.keys(getProperties(objects[0])).find(
    (name) =>
      name !== discriminator &&
      objects.every((item) => getProperties(item)[name] !== undefined) &&
      objects.every((item) => {
        const child = getProperties(item)[name];
        return (
          isObject(child) && resolveSchema(document, child).type === "boolean"
        );
      })
  );
  const emptyOption = options.find(({ fields }) => fields.length === 0)?.value;
  const isAdditiveSelection =
    emptyOption !== undefined &&
    options.some(({ fields }) => fields.length > 0);
  const label = String(schema.title ?? labelFromKey(key));
  return {
    type: "variant",
    key,
    label,
    defaultValue: currentDefault ?? options[0]?.defaultValue ?? {},
    schema: createVariantValidationSchema(document, schema) as JsonObject,
    config: {
      discriminator,
      selection:
        isAdditiveSelection === false
          ? undefined
          : {
              label,
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
    const filterSchema = getFilterSchema(document, property);
    if (filterSchema !== undefined) {
      const conditions = getSchemaChoices(
        document,
        filterSchema.conditionUnion
      );
      for (const condition of conditions) {
        const properties = getProperties(condition);
        const field = isObject(properties.field) ? properties.field : {};
        const operator = isObject(properties.operator)
          ? properties.operator
          : {};
        const fieldChoices = isObject(field)
          ? getFieldChoices(document, field)
          : [];
        if (fieldChoices.length === 0) {
          continue;
        }
        const supported = getChoices(document, operator);
        for (const choice of fieldChoices) {
          const fieldKey = getQueryFieldKey(choice.path);
          const existing = fields.get(fieldKey);
          fields.set(fieldKey, {
            path: choice.path,
            label: choice.label,
            types: ["string"],
            operators: [
              ...new Set([
                ...(existing?.operators ?? []),
                ...supported.map(({ value }) => value),
              ]),
            ],
          });
        }
        const valueSchema = isObject(properties.value) ? properties.value : {};
        for (const choice of supported) {
          operators.set(choice.value, {
            value: choice.value,
            label: choice.label,
            types: ["string"],
            input: {
              control: valueSchema.type === "boolean" ? "none" : "expression",
              defaultValue: JSON.stringify(
                defaultFromSchema(document, valueSchema)
              ),
            },
          });
        }
      }
      const combinators = filterSchema.groups.map(
        ({ combinator }) => combinator
      );
      const maximumConditions = Math.min(
        ...filterSchema.groups.map(({ children }) =>
          typeof children.maxItems === "number"
            ? children.maxItems
            : Number.MAX_SAFE_INTEGER
        )
      );
      const maximumDepth = getFilterDepth(document, property);
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
          limits: {
            conditions: maximumConditions,
            depth: maximumDepth ?? Number.MAX_SAFE_INTEGER,
          },
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
      const fieldChoices = isObject(field)
        ? getFieldChoices(document, field)
        : [];
      if (fieldChoices.length > 0 && directions.length > 0) {
        for (const choice of fieldChoices) {
          const fieldKey = getQueryFieldKey(choice.path);
          if (fields.has(fieldKey) === false) {
            fields.set(fieldKey, {
              path: choice.path,
              label: choice.label,
              types: ["string"],
            });
          }
        }
        controls.push({
          type: "sort",
          key,
          label,
          defaultValue: Array.isArray(property.default)
            ? (property.default as never[])
            : [],
          defaultItem: {
            field: fieldChoices[0].path,
            direction: directions[0].value,
          },
          directions,
          max:
            typeof property.maxItems === "number"
              ? property.maxItems
              : undefined,
        });
        continue;
      }
    }
    if (property.type === "integer" || property.type === "number") {
      controls.push({
        type: "expression",
        key,
        label,
        defaultValue: JSON.stringify(defaultFromSchema(document, property)),
        input: "number",
        ...getNumberControlConstraints(property),
      });
      continue;
    }
    const choices = getChoices(document, property);
    if (property.type === "string" && choices.length > 0) {
      controls.push({
        type: "select",
        key,
        label,
        sectionLabel:
          typeof property["x-webstudio-section"] === "string"
            ? property["x-webstudio-section"]
            : undefined,
        defaultValue: String(defaultFromSchema(document, property)),
        options: choices,
      } satisfies QuerySelectControl);
      continue;
    }
    const variant = createVariantControl({ document, key, schema: property });
    if (variant !== undefined) {
      controls.push(variant);
    }
  }
  return queryDefinition.parse({
    version: 1,
    ...(typeof schema.description === "string"
      ? { description: schema.description }
      : {}),
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
        return { operation: candidate, pathItem };
      }
    }
  }
  throw new Error(`OpenAPI operation ${operationId} is missing`);
};

/** Derives query authoring solely from one standard OpenAPI operation. */
export const getOpenApiQueryDefinition = ({
  document: input,
  operationId,
}: {
  document: unknown;
  operationId: string;
}): QueryDefinition => {
  if (isObject(input) === false) {
    throw new Error("OpenAPI document is invalid");
  }
  const { operation, pathItem } = findOperation(input, operationId);
  const parametersByIdentity = new Map<
    string,
    { key: string; schema: JsonObject }
  >();
  const addParameters = (items: unknown) => {
    if (Array.isArray(items) === false) {
      return;
    }
    for (const item of items) {
      const parameter = resolveSchema(input, item);
      if (
        typeof parameter.name !== "string" ||
        typeof parameter.in !== "string" ||
        isObject(parameter.schema) === false
      ) {
        continue;
      }
      parametersByIdentity.set(`${parameter.in}\0${parameter.name}`, {
        key: parameter.name,
        schema: resolveSchema(input, parameter.schema),
      });
    }
  };
  addParameters(pathItem.parameters);
  addParameters(operation.parameters);
  const parameters = [...parametersByIdentity.values()];
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
    const valuePath =
      required.length === 1 && objectKeys.length === 1 ? [objectKeys[0]] : [];
    const valueSchema =
      valuePath.length === 1
        ? resolveSchema(input, properties[valuePath[0]])
        : requestSchema;
    return createDefinition({ document: input, schema: valueSchema });
  }
  const controls: QueryControl[] = parameters.map(({ key, schema }) => ({
    type: "expression",
    key,
    label: String(schema.title ?? labelFromKey(key)),
    defaultValue: JSON.stringify(defaultFromSchema(input, schema)),
    input:
      schema.type === "integer" || schema.type === "number"
        ? "number"
        : "expression",
    ...getNumberControlConstraints(schema),
  }));
  return queryDefinition.parse({
    version: 1,
    fields: [],
    operators: [],
    source: { fieldPathSchema: true, controls },
  });
};

const getReferenceDocumentUrl = (url: URL) => {
  const documentUrl = new URL(url);
  documentUrl.hash = "";
  return documentUrl.href;
};

/**
 * Loads standard external OpenAPI/JSON Schema references and bundles them as
 * local component schemas before deriving the query UI. Network policy stays
 * with the caller through loadReference.
 */
export const loadOpenApiQueryDefinition = async ({
  document,
  documentUrl,
  operationId,
  loadReference,
}: {
  document: unknown;
  documentUrl: string;
  operationId: string;
  loadReference: (url: string) => Promise<unknown>;
}): Promise<QueryDefinition> => {
  if (isObject(document) === false) {
    throw new Error("OpenAPI document is invalid");
  }
  const rootUrl = getReferenceDocumentUrl(new URL(documentUrl));
  const bundled = structuredClone(document);
  const components = isObject(bundled.components)
    ? bundled.components
    : (bundled.components = {});
  const schemas = isObject(components.schemas)
    ? components.schemas
    : (components.schemas = {});
  const prefixByDocumentUrl = new Map<string, string>([[rootUrl, "#"]]);
  const externalSchemaKeys = new Set<string>();

  const createExternalPrefix = () => {
    let index = prefixByDocumentUrl.size - 1;
    let key = `ExternalQuerySchema${index}`;
    while (Object.hasOwn(schemas, key)) {
      index += 1;
      key = `ExternalQuerySchema${index}`;
    }
    return `#/components/schemas/${key}`;
  };

  const rewriteReferences = async (
    value: unknown,
    baseUrl: string,
    localPrefix: string
  ): Promise<unknown> => {
    if (Array.isArray(value)) {
      return await Promise.all(
        value.map((item) => rewriteReferences(item, baseUrl, localPrefix))
      );
    }
    if (isObject(value) === false) {
      return value;
    }
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([key, item]) => {
          if (key !== "$ref" || typeof item !== "string") {
            return [key, await rewriteReferences(item, baseUrl, localPrefix)];
          }
          if (item.startsWith("#")) {
            return [
              key,
              localPrefix === "#" ? item : `${localPrefix}${item.slice(1)}`,
            ];
          }
          const referenceUrl = new URL(item, baseUrl);
          const fragment = referenceUrl.hash;
          const referenceDocumentUrl = getReferenceDocumentUrl(referenceUrl);
          let referencePrefix = prefixByDocumentUrl.get(referenceDocumentUrl);
          if (referencePrefix === undefined) {
            referencePrefix = createExternalPrefix();
            prefixByDocumentUrl.set(referenceDocumentUrl, referencePrefix);
            const key = referencePrefix.slice("#/components/schemas/".length);
            externalSchemaKeys.add(key);
            // Reserve the destination before reading nested references so
            // mutually referencing documents terminate deterministically.
            schemas[key] = {};
            const external = await loadReference(referenceDocumentUrl);
            if (isObject(external) === false) {
              throw new Error(
                `OpenAPI reference ${referenceDocumentUrl} is invalid`
              );
            }
            schemas[key] = await rewriteReferences(
              external,
              referenceDocumentUrl,
              referencePrefix
            );
          }
          return [
            key,
            fragment.length === 0
              ? referencePrefix
              : `${referencePrefix}${fragment.slice(1)}`,
          ];
        })
      )
    );
  };

  const resolved = await rewriteReferences(bundled, rootUrl, "#");
  if (isObject(resolved) === false) {
    throw new Error("OpenAPI document is invalid");
  }
  const resolvedComponents = isObject(resolved.components)
    ? resolved.components
    : (resolved.components = {});
  const resolvedSchemas = isObject(resolvedComponents.schemas)
    ? resolvedComponents.schemas
    : (resolvedComponents.schemas = {});
  for (const key of externalSchemaKeys) {
    resolvedSchemas[key] = schemas[key];
  }
  return getOpenApiQueryDefinition({
    document: resolved,
    operationId,
  });
};
