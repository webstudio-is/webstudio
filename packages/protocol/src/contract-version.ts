import { z } from "zod";

type ContractFunction = ((...args: never[]) => unknown) & {
  contract?: unknown;
};

const getFunctionContract = (value: unknown) => {
  if (typeof value !== "function") {
    return;
  }
  const contractFunction = value as ContractFunction;
  if (contractFunction.contract !== undefined) {
    return { contract: contractFunction.contract };
  }
  // Function source is transformed differently by test, build, and runtime
  // loaders. Refinements must attach explicit contract metadata to affect the
  // bundle version.
  return { contract: "unversioned-function" };
};

const getSchemaContract = (
  schema: z.ZodTypeAny,
  seen = new Map<z.ZodTypeAny, number>()
): unknown => {
  const schemaId = seen.get(schema);
  if (schemaId !== undefined) {
    return { type: "ref", id: schemaId };
  }
  seen.set(schema, seen.size);

  const definition = schema._def;
  switch (definition.typeName) {
    case z.ZodFirstPartyTypeKind.ZodArray:
      return {
        type: "array",
        value: getSchemaContract(definition.type, seen),
        checks: {
          exactLength: definition.exactLength,
          maxLength: definition.maxLength,
          minLength: definition.minLength,
        },
      };
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return {
        type: "boolean",
      };
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return {
        type: "default",
        value: getSchemaContract(definition.innerType, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return {
        type: "discriminatedUnion",
        discriminator: definition.discriminator,
        options: definition.options.map((option: z.ZodTypeAny) =>
          getSchemaContract(option, seen)
        ),
      };
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return {
        type: "effects",
        effect: definition.effect.type,
        source: getFunctionContract(
          definition.effect.refinement ?? definition.effect.transform
        ),
        value: getSchemaContract(definition.schema, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return {
        type: "enum",
        values: definition.values,
      };
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return {
        type: "literal",
        value: definition.value,
      };
    case z.ZodFirstPartyTypeKind.ZodLazy:
      return {
        type: "lazy",
        value: getSchemaContract(definition.getter(), seen),
      };
    case z.ZodFirstPartyTypeKind.ZodMap:
      return {
        type: "map",
        key: getSchemaContract(definition.keyType, seen),
        value: getSchemaContract(definition.valueType, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodNativeEnum:
      return {
        type: "nativeEnum",
        values: definition.values,
      };
    case z.ZodFirstPartyTypeKind.ZodNever:
      return {
        type: "never",
      };
    case z.ZodFirstPartyTypeKind.ZodNull:
      return {
        type: "null",
      };
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return {
        type: "nullable",
        value: getSchemaContract(definition.innerType, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return {
        type: "number",
        checks: definition.checks,
      };
    case z.ZodFirstPartyTypeKind.ZodObject:
      return {
        type: "object",
        unknownKeys: definition.unknownKeys,
        catchall: getSchemaContract(definition.catchall, seen),
        shape: Object.fromEntries(
          Object.entries(definition.shape())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => [
              key,
              getSchemaContract(value as z.ZodTypeAny, seen),
            ])
        ),
      };
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return {
        type: "optional",
        value: getSchemaContract(definition.innerType, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return {
        type: "record",
        key: getSchemaContract(definition.keyType, seen),
        value: getSchemaContract(definition.valueType, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodString:
      return {
        type: "string",
        checks: definition.checks,
      };
    case z.ZodFirstPartyTypeKind.ZodTuple:
      return {
        type: "tuple",
        items: definition.items.map((item: z.ZodTypeAny) =>
          getSchemaContract(item, seen)
        ),
        rest:
          definition.rest === null
            ? undefined
            : getSchemaContract(definition.rest, seen),
      };
    case z.ZodFirstPartyTypeKind.ZodUndefined:
      return {
        type: "undefined",
      };
    case z.ZodFirstPartyTypeKind.ZodUnknown:
      return {
        type: "unknown",
      };
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return {
        type: "union",
        options: definition.options.map((option: z.ZodTypeAny) =>
          getSchemaContract(option, seen)
        ),
      };
    default:
      throw new Error(
        `Unsupported schema contract type: ${definition.typeName}`
      );
  }
};

const stableStringify = (value: unknown): string => {
  if (value === undefined) {
    return "undefined";
  }
  if (value instanceof RegExp) {
    return stableStringify({
      source: value.source,
      flags: value.flags,
    });
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const createContractVersion = (
  schema: z.ZodTypeAny,
  additionalSchemas: z.ZodTypeAny[] = []
) => {
  let hash = 0x811c9dc5;
  for (const char of stableStringify({
    additionalSchemas: additionalSchemas.map((schema) =>
      getSchemaContract(schema)
    ),
    schema: getSchemaContract(schema),
  })) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `bundle-${(hash >>> 0).toString(16).padStart(8, "0")}` as const;
};
