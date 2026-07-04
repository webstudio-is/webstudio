import { z } from "zod";

type HiddenInputField = (field: string, schema: z.ZodTypeAny) => boolean;

export const runtimeGeneratedIdInputDescription = "runtimeGeneratedIdInput";

export type InputSchemaMetadata = {
  inputFields: readonly string[];
  requiredInputFields: readonly string[];
  inputFieldTypes: Partial<Record<string, "array">>;
};

const unwrapSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  const schemaWithUnwrap = schema as z.ZodTypeAny & {
    unwrap?: () => z.ZodTypeAny;
  };
  if (typeof schemaWithUnwrap.unwrap === "function") {
    return unwrapSchema(schemaWithUnwrap.unwrap());
  }
  if ("innerType" in schema._def) {
    return unwrapSchema(schema._def.innerType);
  }
  if ("schema" in schema._def) {
    return unwrapSchema(schema._def.schema);
  }
  return schema;
};

const getObjectShape = (schema: z.ZodTypeAny) => {
  if ("shape" in schema) {
    return schema.shape;
  }
  if ("shape" in schema._def) {
    return typeof schema._def.shape === "function"
      ? schema._def.shape()
      : schema._def.shape;
  }
};

const unique = (values: readonly string[]) => [...new Set(values)];

export const isRuntimeGeneratedIdInput = (schema: z.ZodTypeAny) =>
  schema.description === runtimeGeneratedIdInputDescription;

export const isHiddenPublicApiInputField: HiddenInputField = (field, schema) =>
  field === "projectId" ||
  field === "confirm" ||
  isRuntimeGeneratedIdInput(schema);

export const getRuntimeGeneratedInputPaths = (
  schema: z.ZodTypeAny,
  path: string[] = []
): string[][] => {
  if (isRuntimeGeneratedIdInput(schema)) {
    return [path];
  }
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodArray) {
    return getRuntimeGeneratedInputPaths(unwrapped.element, [...path, "*"]);
  }
  const shape = getObjectShape(unwrapped);
  if (shape !== undefined) {
    return Object.entries(shape).flatMap(([field, fieldSchema]) =>
      getRuntimeGeneratedInputPaths(fieldSchema as z.ZodTypeAny, [
        ...path,
        field,
      ])
    );
  }
  return [];
};

export const getInputSchemaMetadata = (
  schema: z.ZodTypeAny,
  options: { isHiddenField?: HiddenInputField } = {}
): InputSchemaMetadata => {
  const { isHiddenField = () => false } = options;
  const unwrapped = unwrapSchema(schema);
  const shape = getObjectShape(unwrapped);
  if (shape !== undefined) {
    const inputFields: string[] = [];
    const requiredInputFields: string[] = [];
    const inputFieldTypes: Record<string, "array"> = {};
    for (const [field, fieldSchema] of Object.entries(shape)) {
      const zodFieldSchema = fieldSchema as z.ZodTypeAny;
      if (isHiddenField(field, zodFieldSchema)) {
        continue;
      }
      inputFields.push(field);
      if (zodFieldSchema.safeParse(undefined).success === false) {
        requiredInputFields.push(field);
      }
      if (unwrapSchema(zodFieldSchema) instanceof z.ZodArray) {
        inputFieldTypes[field] = "array";
      }
    }
    return {
      inputFields,
      requiredInputFields,
      inputFieldTypes,
    };
  }
  if ("left" in unwrapped._def && "right" in unwrapped._def) {
    const left = getInputSchemaMetadata(unwrapped._def.left, options);
    const right = getInputSchemaMetadata(unwrapped._def.right, options);
    return {
      inputFields: unique([...left.inputFields, ...right.inputFields]),
      requiredInputFields: unique([
        ...left.requiredInputFields,
        ...right.requiredInputFields,
      ]),
      inputFieldTypes: {
        ...left.inputFieldTypes,
        ...right.inputFieldTypes,
      },
    };
  }
  return {
    inputFields: [],
    requiredInputFields: [],
    inputFieldTypes: {},
  };
};
