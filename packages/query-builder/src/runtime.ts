import {
  array,
  lazy,
  strictObject,
  union,
  type ZodType,
  type input as ZodInput,
  type output as ZodOutput,
} from "zod";
import type { QueryWhereTree } from "./types";

const collectQueryConditions = <Condition extends { field: unknown }>(
  where: QueryWhereTree<Condition>
): Condition[] => {
  if ("field" in where) {
    return [where];
  }
  return ("all" in where ? where.all : where.any).flatMap(
    collectQueryConditions
  );
};

export const getQueryConditions = <Condition extends { field: unknown }>(
  where: QueryWhereTree<Condition>
) => collectQueryConditions(where);

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

/** Evaluates a boolean query tree while preserving an unknown leaf result. */
export const evaluateQueryWhere = <Condition extends { field: unknown }>(
  where: QueryWhereTree<Condition>,
  evaluateCondition: (condition: Condition) => boolean | undefined
): boolean | undefined => {
  if ("field" in where) {
    return evaluateCondition(where);
  }
  const children = "all" in where ? where.all : where.any;
  let hasUnknown = false;
  if ("all" in where) {
    for (const child of children) {
      const result = evaluateQueryWhere(child, evaluateCondition);
      if (result === false) {
        return false;
      }
      hasUnknown ||= result === undefined;
    }
    return hasUnknown ? undefined : true;
  }
  for (const child of children) {
    const result = evaluateQueryWhere(child, evaluateCondition);
    if (result === true) {
      return true;
    }
    hasUnknown ||= result === undefined;
  }
  return hasUnknown ? undefined : false;
};

export const getQueryFieldKey = (field: readonly string[]) =>
  JSON.stringify(field);

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

export const createQueryWhereSchema = <
  ConditionSchema extends ZodType<{ field: unknown }>,
>(
  conditionSchema: ConditionSchema,
  options: {
    maximumChildren?: number;
    maximumConditions?: number;
    maximumDepth?: number;
    maximumConditionsMessage?: string;
    maximumDepthMessage?: string;
  } = {}
) => {
  type Input = QueryWhereTree<ZodInput<ConditionSchema>>;
  type Output = QueryWhereTree<ZodOutput<ConditionSchema>>;
  const createNode = (child: ZodType<Output, Input>) => {
    const children = array(child);
    const boundedChildren =
      options.maximumChildren === undefined
        ? children
        : children.max(options.maximumChildren);
    return union([
      conditionSchema,
      strictObject({ all: boundedChildren }),
      strictObject({ any: boundedChildren }),
    ]);
  };
  const node: ZodType<Output, Input> = lazy(() => createNode(node));
  if (
    options.maximumConditions === undefined &&
    options.maximumDepth === undefined
  ) {
    return node;
  }
  return node.superRefine((where, context) => {
    const { conditions, depth } = getQueryWhereMetrics(where);
    if (
      options.maximumConditions !== undefined &&
      conditions > options.maximumConditions
    ) {
      context.addIssue({
        code: "custom",
        message:
          options.maximumConditionsMessage ??
          "Query exceeds the condition limit",
      });
    }
    if (options.maximumDepth !== undefined && depth > options.maximumDepth) {
      context.addIssue({
        code: "custom",
        message:
          options.maximumDepthMessage ?? "Query exceeds the nesting limit",
      });
    }
  });
};

export type { QueryWhereTree } from "./types";
