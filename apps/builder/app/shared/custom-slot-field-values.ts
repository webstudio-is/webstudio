import { isLiteralExpression } from "@webstudio-is/sdk";

export type CustomSlotFieldSchema = {
  id: string;
  name: string;
};

export type CustomSlotFieldValue =
  | {
      type: "literal";
      value: unknown;
    }
  | {
      type: "expression";
      value: string;
    };

export type CustomSlotFieldValues = Record<string, CustomSlotFieldValue>;

export const parseCustomSlotSchema = (
  value: unknown
): CustomSlotFieldSchema[] => {
  if (Array.isArray(value) === false) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "name" in item
    ) {
      return [{ id: String(item.id), name: String(item.name) }];
    }
    return [];
  });
};

const parseCustomSlotFieldValue = (
  value: unknown
): undefined | CustomSlotFieldValue => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }

  const record = value as Record<string, unknown>;

  if (record.type === "expression" && typeof record.value === "string") {
    return {
      type: "expression",
      value: record.value,
    };
  }

  if (record.type === "literal" && "value" in record) {
    return {
      type: "literal",
      value: record.value,
    };
  }
};

export const parseCustomSlotFieldValues = (
  value: unknown
): CustomSlotFieldValues => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const values: CustomSlotFieldValues = {};

  for (const [fieldId, fieldValue] of Object.entries(value)) {
    const parsedValue = parseCustomSlotFieldValue(fieldValue);
    if (parsedValue !== undefined) {
      values[fieldId] = parsedValue;
    }
  }

  return values;
};

export const createCustomSlotLiteralValue = (
  value: unknown
): CustomSlotFieldValue => ({
  type: "literal",
  value,
});

export const parseCustomSlotFieldEditorValue = (
  value: string
): CustomSlotFieldValue => {
  if (value.length > 0 && isLiteralExpression(value)) {
    try {
      return createCustomSlotLiteralValue(new Function(`return (${value})`)());
    } catch {
      // fall back to plain string below
    }
  }

  return createCustomSlotLiteralValue(value);
};

export const evaluateCustomSlotFieldValue = ({
  fieldValue,
  evaluateExpression,
}: {
  fieldValue: undefined | CustomSlotFieldValue;
  evaluateExpression: (expression: string) => unknown;
}) => {
  if (fieldValue === undefined) {
    return "";
  }

  if (fieldValue.type === "literal") {
    return fieldValue.value;
  }

  return evaluateExpression(fieldValue.value);
};

export const buildCustomSlotComponentValue = ({
  schema,
  values,
  evaluateExpression,
}: {
  schema: CustomSlotFieldSchema[];
  values: CustomSlotFieldValues;
  evaluateExpression: (expression: string) => unknown;
}) => {
  const result: Record<string, unknown> = {};

  for (const field of schema) {
    result[field.name] = evaluateCustomSlotFieldValue({
      fieldValue: values[field.id],
      evaluateExpression,
    });
  }

  return result;
};
