import type { QueryCondition, QueryDefinition, QuerySort } from "./types";
import { getQueryFieldKey } from "./runtime";

export const addConfiguredQueryFields = <
  FieldType extends string,
  Operator extends string,
>({
  definition,
  paths,
  fallbackType,
}: {
  definition: QueryDefinition<FieldType, Operator>;
  paths: readonly string[][];
  fallbackType: FieldType;
}): QueryDefinition<FieldType, Operator> => {
  const fields = new Map(
    definition.fields.map((field) => [getQueryFieldKey(field.path), field])
  );
  for (const path of paths) {
    const key = getQueryFieldKey(path);
    if (fields.has(key)) {
      continue;
    }
    fields.set(key, {
      path,
      label: path.join(" / "),
      types: [fallbackType],
      operators: definition.operators.map(({ value }) => value),
    });
  }
  return { ...definition, fields: [...fields.values()] };
};

export const getCompatibleQueryOperators = <
  FieldType extends string,
  Operator extends string,
  Item extends {
    value: Operator;
    types: readonly FieldType[];
  },
>(
  fieldTypes: readonly FieldType[],
  operators: readonly Item[],
  supportedOperators?: readonly string[]
) => {
  if (supportedOperators !== undefined) {
    const supported = new Set(supportedOperators);
    return operators.filter(({ value }) => supported.has(value));
  }
  const types = new Set(fieldTypes);
  return operators.filter((operator) =>
    operator.types.some((type) => types.has(type))
  );
};

export const createQueryCondition = <
  FieldType extends string,
  Operator extends string,
>(
  capabilities: QueryDefinition<FieldType, Operator>
): QueryCondition<string[], Operator> => {
  const control = capabilities.source.controls.find(
    (item) => item.type === "filter"
  );
  if (control === undefined) {
    throw new Error("A filter control is required");
  }
  return {
    field: [...control.defaultCondition.field],
    operator: control.defaultCondition.operator,
    value:
      capabilities.operators.find(
        ({ value }) => value === control.defaultCondition.operator
      )?.input.defaultValue ?? "null",
  };
};

export const createQuerySort = <
  FieldType extends string,
  Operator extends string,
>(
  capabilities: QueryDefinition<FieldType, Operator>
): QuerySort<string[]> => {
  const control = capabilities.source.controls.find(
    (item) => item.type === "sort"
  );
  if (control === undefined) {
    throw new Error("A sort control is required");
  }
  return {
    field: [...control.defaultItem.field],
    direction: control.defaultItem.direction,
  };
};

export const createStructuredQuery = <
  Query extends Record<string, unknown> = Record<string, unknown>,
>(capabilities: {
  source: {
    controls: readonly { key: string; defaultValue: unknown }[];
  };
}): Query => {
  return Object.fromEntries(
    capabilities.source.controls.map(({ key, defaultValue }) => [
      key,
      structuredClone(defaultValue),
    ])
  ) as Query;
};
