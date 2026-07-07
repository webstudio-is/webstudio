import hash from "@emotion/hash";
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

type ZodDefinition = z.ZodTypeAny["def"] & Record<string, unknown>;
type ZodCheck = {
  _zod?: {
    def?: unknown;
    check?: unknown;
  };
};

const getDefinition = (schema: z.ZodTypeAny) => schema.def as ZodDefinition;

const isZodSchema = (value: unknown): value is z.ZodTypeAny =>
  typeof value === "object" &&
  value !== null &&
  "_zod" in value &&
  "def" in value;

const getSchemaContractOrUndefined = (
  value: unknown,
  seen: Map<z.ZodTypeAny, number>
) => (isZodSchema(value) ? getSchemaContract(value, seen) : undefined);

const getChecksContract = (checks: unknown) =>
  Array.isArray(checks)
    ? checks.map((check) => {
        const internal = (check as ZodCheck)._zod;
        return {
          definition: internal?.def,
          source: getFunctionContract(
            typeof internal?.def === "object" &&
              internal.def !== null &&
              "fn" in internal.def
              ? internal.def.fn
              : internal?.check
          ),
        };
      })
    : undefined;

const getSchemaContract = (
  schema: z.ZodTypeAny,
  seen = new Map<z.ZodTypeAny, number>()
): unknown => {
  const schemaId = seen.get(schema);
  if (schemaId !== undefined) {
    return { type: "ref", id: schemaId };
  }
  seen.set(schema, seen.size);

  const definition = getDefinition(schema);
  switch (definition.type) {
    case "array":
      return {
        type: "array",
        value: getSchemaContractOrUndefined(definition.element, seen),
        checks: getChecksContract(definition.checks),
      };
    case "bigint":
      return {
        type: "bigint",
        checks: getChecksContract(definition.checks),
      };
    case "boolean":
      return {
        type: "boolean",
      };
    case "catch":
    case "default":
    case "prefault":
      return {
        type: definition.type,
        value: getSchemaContractOrUndefined(definition.innerType, seen),
      };
    case "date":
      return {
        type: "date",
        checks: getChecksContract(definition.checks),
      };
    case "enum":
      return {
        type: "enum",
        entries: definition.entries,
      };
    case "intersection":
      return {
        type: "intersection",
        left: getSchemaContractOrUndefined(definition.left, seen),
        right: getSchemaContractOrUndefined(definition.right, seen),
      };
    case "int":
      return {
        type: "int",
        checks: getChecksContract(definition.checks),
      };
    case "literal":
      return {
        type: "literal",
        values: definition.values,
      };
    case "lazy":
      return {
        type: "lazy",
        value:
          typeof definition.getter === "function"
            ? getSchemaContract(definition.getter(), seen)
            : undefined,
      };
    case "map":
      return {
        type: "map",
        key: getSchemaContractOrUndefined(definition.keyType, seen),
        value: getSchemaContractOrUndefined(definition.valueType, seen),
      };
    case "nan":
      return {
        type: "nan",
      };
    case "never":
      return {
        type: "never",
      };
    case "nonoptional":
    case "nullable":
    case "optional":
    case "readonly":
      return {
        type: definition.type,
        value: getSchemaContractOrUndefined(definition.innerType, seen),
      };
    case "null":
      return {
        type: "null",
      };
    case "number":
      return {
        type: "number",
        checks: getChecksContract(definition.checks),
      };
    case "object":
      return {
        type: "object",
        catchall: getSchemaContractOrUndefined(definition.catchall, seen),
        shape: Object.fromEntries(
          Object.entries(
            typeof definition.shape === "function"
              ? definition.shape()
              : (definition.shape as object)
          )
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => [
              key,
              getSchemaContract(value as z.ZodTypeAny, seen),
            ])
        ),
      };
    case "pipe":
      return {
        type: "pipe",
        in: getSchemaContractOrUndefined(definition.in, seen),
        out: getSchemaContractOrUndefined(definition.out, seen),
      };
    case "promise":
      return {
        type: "promise",
        value: getSchemaContractOrUndefined(definition.innerType, seen),
      };
    case "record":
      return {
        type: "record",
        key: getSchemaContractOrUndefined(definition.keyType, seen),
        value: getSchemaContractOrUndefined(definition.valueType, seen),
      };
    case "set":
      return {
        type: "set",
        value: getSchemaContractOrUndefined(definition.valueType, seen),
        checks: getChecksContract(definition.checks),
      };
    case "string":
      return {
        type: "string",
        checks: getChecksContract(definition.checks),
      };
    case "transform":
      return {
        type: "transform",
        source: getFunctionContract(definition.transform),
      };
    case "tuple":
      return {
        type: "tuple",
        items: Array.isArray(definition.items)
          ? definition.items.map((item) =>
              getSchemaContractOrUndefined(item, seen)
            )
          : undefined,
        rest: getSchemaContractOrUndefined(definition.rest, seen),
      };
    case "undefined":
      return {
        type: "undefined",
      };
    case "union":
      return {
        type:
          typeof definition.discriminator === "string"
            ? "discriminatedUnion"
            : "union",
        discriminator: definition.discriminator,
        options: Array.isArray(definition.options)
          ? definition.options.map((option) =>
              getSchemaContractOrUndefined(option, seen)
            )
          : undefined,
      };
    case "unknown":
      return {
        type: "unknown",
      };
    case "void":
      return {
        type: "void",
      };
    default:
      throw new Error(`Unsupported schema contract type: ${definition.type}`);
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
  if (typeof value === "function") {
    return stableStringify(getFunctionContract(value));
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
  return `bundle-${hash(
    stableStringify({
      additionalSchemas: additionalSchemas.map((schema) =>
        getSchemaContract(schema)
      ),
      schema: getSchemaContract(schema),
    })
  )}` as const;
};
