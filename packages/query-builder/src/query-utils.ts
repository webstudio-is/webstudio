import type {
  QueryCondition,
  QueryDefinition,
  QuerySort,
  QueryWhereTree,
} from "./types";

const collectQueryConditions = (
  where: QueryWhereTree<{ field: unknown }>
): { field: unknown }[] => {
  if ("field" in where) {
    return [where];
  }
  return ("all" in where ? where.all : where.any).flatMap(
    collectQueryConditions
  );
};

export const getQueryConditions = <Condition extends { field: unknown }>(
  where: QueryWhereTree<Condition>
) => collectQueryConditions(where) as Condition[];

export const mapQueryWhere = <
  Input extends { field: unknown },
  Output extends { field: unknown },
>(
  where: QueryWhereTree<Input>,
  mapCondition: (condition: Input) => Output
): QueryWhereTree<Output> => {
  if ("field" in where) {
    return mapCondition(where);
  }
  if ("all" in where) {
    return {
      all: where.all.map((child) => mapQueryWhere(child, mapCondition)),
    };
  }
  return { any: where.any.map((child) => mapQueryWhere(child, mapCondition)) };
};

export const getQueryFieldKey = (field: readonly string[]) =>
  JSON.stringify(field);

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

export const getQueryWhereMetrics = (
  where: QueryWhereTree<{ field: unknown }>
): { conditions: number; depth: number } => {
  if ("field" in where) {
    return { conditions: 1, depth: 0 };
  }
  const children = "all" in where ? where.all : where.any;
  let conditions = 0;
  let depth = 1;
  for (const child of children) {
    const metrics = getQueryWhereMetrics(child);
    conditions += metrics.conditions;
    depth = Math.max(depth, metrics.depth + 1);
  }
  return { conditions, depth };
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
  FieldType extends string,
  Operator extends string,
>(
  capabilities: QueryDefinition<FieldType, Operator>
): Record<string, unknown> => {
  return Object.fromEntries(
    capabilities.source.controls.map(({ key, defaultValue }) => [
      key,
      structuredClone(defaultValue),
    ])
  );
};
