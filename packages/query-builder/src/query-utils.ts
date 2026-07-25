import type {
  QueryCapabilities,
  QueryCondition,
  QuerySort,
  StructuredQuery,
} from "./types";

type WhereShape<Condition extends { field: unknown }> =
  | Condition
  | { all: WhereShape<Condition>[] }
  | { any: WhereShape<Condition>[] };

const collectQueryConditions = (
  where: WhereShape<{ field: unknown }>
): { field: unknown }[] => {
  if ("field" in where) {
    return [where];
  }
  return ("all" in where ? where.all : where.any).flatMap(
    collectQueryConditions
  );
};

export const getQueryConditions = <Condition extends { field: unknown }>(
  where: WhereShape<Condition>
) => collectQueryConditions(where) as Condition[];

type AnyWhereShape = WhereShape<{ field: unknown }>;

export const getQueryFieldKey = (field: readonly string[]) =>
  JSON.stringify(field);

export const getQueryWhereMetrics = (
  where: AnyWhereShape
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
  operators: readonly Item[]
) => {
  const types = new Set(fieldTypes);
  return operators.filter((operator) =>
    operator.types.some((type) => types.has(type))
  );
};

export const createQueryCondition = <
  FieldType extends string,
  Operator extends string,
>({
  defaults,
  operators,
}: QueryCapabilities<FieldType, Operator>): QueryCondition<
  string[],
  Operator
> => ({
  field: [...defaults.condition.field],
  operator: defaults.condition.operator,
  value:
    operators.find(({ value }) => value === defaults.condition.operator)?.input
      .defaultValue ?? "null",
});

export const createQuerySort = <
  FieldType extends string,
  Operator extends string,
>({
  defaults,
}: QueryCapabilities<FieldType, Operator>): QuerySort<string[]> => ({
  field: [...defaults.sort.field],
  direction: defaults.sort.direction,
});

export const createStructuredQuery = <
  FieldType extends string,
  Operator extends string,
>(
  capabilities: QueryCapabilities<FieldType, Operator>
): StructuredQuery<string[], Operator, Record<string, unknown>> => {
  const combinator = capabilities.features.combinators[0] ?? "all";
  const parameters = Object.fromEntries(
    capabilities.source.parameters.map(({ key, defaultValue }) => [
      key,
      structuredClone(defaultValue),
    ])
  );
  return {
    where: combinator === "all" ? { all: [] } : { any: [] },
    sort: [],
    limit: capabilities.defaults.limit,
    offset: capabilities.defaults.offset,
    ...parameters,
  };
};

export const normalizeStructuredQuery = <
  FieldType extends string,
  Operator extends string,
  Query extends StructuredQuery<string[], Operator>,
>(
  query: Query,
  capabilities: QueryCapabilities<FieldType, Operator>
): Query => {
  if ("field" in query.where === false) {
    return query;
  }
  const combinator = capabilities.features.combinators[0] ?? "all";
  return {
    ...query,
    where:
      combinator === "all" ? { all: [query.where] } : { any: [query.where] },
  };
};
