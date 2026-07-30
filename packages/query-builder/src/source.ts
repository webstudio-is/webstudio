import {
  generateJsonExpression,
  generateObjectExpression,
  parseArrayExpression,
  parseExpressionObject,
  parseJsonExpression,
} from "@webstudio-is/expression";
import { z } from "zod";
import type {
  QueryExpressionControl,
  QueryFilterControl,
  QuerySortControl,
  QuerySourceDefinition,
  QuerySourceCodec,
  QueryWhere,
} from "./types";
import { getQueryFieldKey, getQueryWhereMetrics } from "./runtime";
import { getCompatibleQueryOperators } from "./query-utils";

const createJsonSchemaParser = (schema: boolean | Record<string, unknown>) => {
  let parser: z.ZodType;
  try {
    parser = z.fromJSONSchema(schema as never);
  } catch {
    parser = z.never();
  }
  return (value: unknown) => parser.safeParse(value);
};

export const isQueryExpression = (value: string) =>
  value.trim() !== "" && parseArrayExpression(`[${value}]`)?.length === 1;

const isFieldPath = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((segment) => typeof segment === "string");

const isControlExpressionValid = (
  expression: string,
  control: QueryExpressionControl
) => {
  if (isQueryExpression(expression) === false) {
    return false;
  }
  if (control.input !== "number") {
    return true;
  }
  const value = parseJsonExpression(expression);
  if (value === undefined) {
    return true;
  }
  return (
    typeof value === "number" &&
    (control.integer !== true || Number.isInteger(value)) &&
    (control.min === undefined ||
      (control.exclusiveMin ? value > control.min : value >= control.min)) &&
    (control.max === undefined ||
      (control.exclusiveMax ? value < control.max : value <= control.max))
  );
};

const getFieldCapability = <FieldType extends string>(
  field: readonly string[],
  capabilities: Pick<QuerySourceDefinition<FieldType>, "fields">
) =>
  capabilities.fields.find(
    ({ path }) => getQueryFieldKey(path) === getQueryFieldKey(field)
  );

const isOperatorCompatible = <
  FieldType extends string,
  Operator extends string,
>({
  field,
  operator,
  capabilities,
}: {
  field: string[];
  operator: string;
  capabilities: QuerySourceDefinition<FieldType, Operator>;
}) => {
  const operatorCapability = capabilities.operators.find(
    ({ value }) => value === operator
  );
  if (operatorCapability === undefined) {
    return false;
  }
  const fieldCapability = getFieldCapability(field, capabilities);
  if (fieldCapability === undefined) {
    return true;
  }
  return getCompatibleQueryOperators(
    fieldCapability.types,
    capabilities.operators,
    fieldCapability.operators
  ).includes(operatorCapability);
};

const parseWhere = <FieldType extends string, Operator extends string>({
  expression,
  capabilities,
  control,
  parseFieldPath,
  depth = 0,
}: {
  expression: string;
  capabilities: QuerySourceDefinition<FieldType, Operator>;
  control: QueryFilterControl<Operator>;
  parseFieldPath: ReturnType<typeof createJsonSchemaParser>;
  depth?: number;
}): QueryWhere<string[], Operator> | undefined => {
  if (depth > control.limits.depth) {
    return;
  }
  const fields = parseExpressionObject(expression);
  if (fields === undefined) {
    return;
  }
  const combinator = fields.has("all")
    ? "all"
    : fields.has("any")
      ? "any"
      : undefined;
  if (combinator !== undefined) {
    if (
      fields.size !== 1 ||
      control.combinators.includes(combinator) === false
    ) {
      return;
    }
    const items = parseArrayExpression(fields.get(combinator) ?? "");
    if (items === undefined) {
      return;
    }
    const children = items.map((item) =>
      parseWhere({
        expression: item,
        capabilities,
        control,
        parseFieldPath,
        depth: depth + 1,
      })
    );
    if (children.some((child) => child === undefined)) {
      return;
    }
    return combinator === "all"
      ? { all: children as QueryWhere<string[], Operator>[] }
      : { any: children as QueryWhere<string[], Operator>[] };
  }

  const field = parseJsonExpression(fields.get("field"));
  const operator = parseJsonExpression(fields.get("operator"));
  const value = fields.get("value");
  if (
    fields.size !== 3 ||
    parseFieldPath(field).success === false ||
    isFieldPath(field) === false ||
    typeof operator !== "string" ||
    isOperatorCompatible({
      field,
      operator,
      capabilities,
    }) === false ||
    value === undefined ||
    isQueryExpression(value) === false
  ) {
    return;
  }
  return { field, operator: operator as Operator, value };
};

const formatWhere = <FieldType extends string, Operator extends string>({
  where,
  capabilities,
  control,
  parseFieldPath,
  depth = 0,
}: {
  where: QueryWhere<string[], Operator>;
  capabilities: QuerySourceDefinition<FieldType, Operator>;
  control: QueryFilterControl<Operator>;
  parseFieldPath: ReturnType<typeof createJsonSchemaParser>;
  depth?: number;
}): string => {
  if (depth > control.limits.depth) {
    throw new Error("Query filter nesting limit was exceeded");
  }
  if ("field" in where === false) {
    const combinator = "all" in where ? "all" : "any";
    if (control.combinators.includes(combinator) === false) {
      throw new Error("Query combinator is unsupported");
    }
    const children = ("all" in where ? where.all : where.any).map((child) =>
      formatWhere({
        where: child,
        capabilities,
        control,
        parseFieldPath,
        depth: depth + 1,
      })
    );
    return generateObjectExpression(
      new Map([[combinator, `[${children.join(",")}]`]])
    );
  }
  if (
    parseFieldPath(where.field).success === false ||
    isOperatorCompatible({
      field: where.field,
      operator: where.operator,
      capabilities,
    }) === false ||
    isQueryExpression(where.value) === false
  ) {
    throw new Error("Query condition is invalid");
  }
  return generateObjectExpression(
    new Map([
      ["field", JSON.stringify(where.field)],
      ["operator", JSON.stringify(where.operator)],
      ["value", where.value],
    ])
  );
};

export const createQuerySourceCodec = <
  FieldType extends string,
  Operator extends string,
  Query extends Record<string, unknown>,
>(
  capabilities: QuerySourceDefinition<FieldType, Operator>
): QuerySourceCodec<Query> => {
  const parseFieldPath = createJsonSchemaParser(
    capabilities.source.fieldPathSchema
  );
  const variantParsers = new Map(
    capabilities.source.controls.flatMap((control) =>
      control.type === "variant"
        ? [[control.key, createJsonSchemaParser(control.schema)] as const]
        : []
    )
  );
  const parseSort = (value: unknown, control: QuerySortControl) => {
    if (
      Array.isArray(value) === false ||
      (control.max !== undefined && value.length > control.max)
    ) {
      return;
    }
    const directions = new Set(control.directions.map(({ value }) => value));
    const items = value.map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        Object.keys(item).length !== 2 ||
        !("field" in item) ||
        !("direction" in item) ||
        parseFieldPath(item.field).success === false ||
        isFieldPath(item.field) === false ||
        typeof item.direction !== "string" ||
        directions.has(item.direction) === false
      ) {
        return;
      }
      return { field: item.field, direction: item.direction };
    });
    return items.some((item) => item === undefined) ? undefined : items;
  };
  return {
    parse: (source) => {
      const expressions = parseExpressionObject(source);
      const controls = capabilities.source.controls;
      if (
        expressions === undefined ||
        [...expressions.keys()].some(
          (key) => controls.some((control) => control.key === key) === false
        )
      ) {
        return { success: false, message: "Complete every query field." };
      }
      const value: Record<string, unknown> = {};
      for (const control of controls) {
        const expression =
          expressions.get(control.key) ??
          (control.type === "expression"
            ? control.defaultValue
            : generateJsonExpression(control.defaultValue));
        if (control.type === "expression") {
          if (isControlExpressionValid(expression, control) === false) {
            return {
              success: false,
              message: `Enter a valid ${control.label.toLowerCase()}.`,
            };
          }
          value[control.key] = expression;
          continue;
        }
        if (control.type === "filter") {
          const where = parseWhere({
            expression,
            capabilities,
            control,
            parseFieldPath,
          });
          const metrics =
            where === undefined ? undefined : getQueryWhereMetrics(where);
          if (
            where === undefined ||
            metrics === undefined ||
            metrics.conditions > control.limits.conditions ||
            metrics.depth > control.limits.depth
          ) {
            return {
              success: false,
              message: `Enter valid ${control.label.toLowerCase()}.`,
            };
          }
          value[control.key] = where;
          continue;
        }
        const parsedJson = parseJsonExpression(expression);
        if (control.type === "sort") {
          const sort = parseSort(parsedJson, control);
          if (sort === undefined) {
            return {
              success: false,
              message: `Enter valid ${control.label.toLowerCase()}.`,
            };
          }
          value[control.key] = sort;
          continue;
        }
        const parsed = variantParsers.get(control.key)?.(parsedJson);
        if (parsed?.success !== true) {
          return {
            success: false,
            message: `Enter a valid ${control.label.toLowerCase()}.`,
          };
        }
        value[control.key] = parsed.data;
      }
      return { success: true, value: value as Query };
    },
    format: (query) => {
      const fields = new Map<string, string>();
      for (const control of capabilities.source.controls) {
        const value =
          query[control.key] ?? structuredClone(control.defaultValue);
        if (control.type === "expression") {
          if (
            typeof value !== "string" ||
            isControlExpressionValid(value, control) === false
          ) {
            throw new Error(`Query ${control.key} is invalid`);
          }
          fields.set(control.key, value);
          continue;
        }
        if (control.type === "filter") {
          const where = value as QueryWhere<string[], Operator>;
          const metrics = getQueryWhereMetrics(where);
          if (
            metrics.conditions > control.limits.conditions ||
            metrics.depth > control.limits.depth
          ) {
            throw new Error("Query filter limits were exceeded");
          }
          fields.set(
            control.key,
            formatWhere({ where, capabilities, control, parseFieldPath })
          );
          continue;
        }
        if (control.type === "sort") {
          if (parseSort(value, control) === undefined) {
            throw new Error(`Query ${control.key} is invalid`);
          }
          fields.set(control.key, generateJsonExpression(value));
          continue;
        }
        const parsed = variantParsers.get(control.key)?.(value);
        if (parsed?.success !== true) {
          throw new Error(`Query ${control.key} is invalid`);
        }
        fields.set(control.key, generateJsonExpression(parsed.data));
      }
      return `(${generateObjectExpression(fields)})`;
    },
  };
};
