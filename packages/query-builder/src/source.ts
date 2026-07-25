import { parseExpressionAt } from "acorn";
import { z } from "zod";
import type {
  QueryCapabilities,
  QuerySourceCodec,
  QueryWhere,
  StructuredQuery,
} from "./types";
import { getQueryWhereMetrics } from "./query-utils";

export const parseExpressionObject = (source: string) => {
  const fields = new Map<string, string>();
  let root;
  try {
    root = parseExpressionAt(source, 0, { ecmaVersion: "latest" });
  } catch {
    return fields;
  }
  if (
    root.type !== "ObjectExpression" ||
    source.slice(root.end).trim() !== ""
  ) {
    return fields;
  }
  for (const property of root.properties) {
    if (property.type === "SpreadElement" || property.computed) {
      return new Map<string, string>();
    }
    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal" &&
            typeof property.key.value === "string"
          ? property.key.value
          : undefined;
    if (key === undefined || fields.has(key)) {
      return new Map<string, string>();
    }
    fields.set(key, source.slice(property.value.start, property.value.end));
  }
  return fields;
};

export const parseExpressionArray = (source: string) => {
  let root;
  try {
    root = parseExpressionAt(source, 0, { ecmaVersion: "latest" });
  } catch {
    return;
  }
  if (root.type !== "ArrayExpression" || source.slice(root.end).trim() !== "") {
    return;
  }
  const items: string[] = [];
  for (const element of root.elements) {
    if (element === null || element.type === "SpreadElement") {
      return;
    }
    items.push(source.slice(element.start, element.end));
  }
  return items;
};

export const formatExpressionObject = (fields: ReadonlyMap<string, string>) => {
  let source = "{\n";
  for (const [key, value] of fields) {
    source += `  ${JSON.stringify(key)}: ${value},\n`;
  }
  return `${source}}`;
};

const parseJsonExpression = (expression: string | undefined) => {
  if (expression === undefined) {
    return;
  }
  try {
    return JSON.parse(expression) as unknown;
  } catch {
    return;
  }
};

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
  value.trim() !== "" && parseExpressionArray(`[${value}]`)?.length === 1;

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
  capabilities: QueryCapabilities<FieldType, Operator>;
}) => {
  const operatorCapability = capabilities.operators.find(
    ({ value }) => value === operator
  );
  if (operatorCapability === undefined) {
    return false;
  }
  const fieldCapability = capabilities.fields.find(
    ({ path }) => JSON.stringify(path) === JSON.stringify(field)
  );
  return (
    fieldCapability === undefined ||
    operatorCapability.types.some((type) =>
      fieldCapability.types.includes(type)
    )
  );
};

const parseWhere = <FieldType extends string, Operator extends string>({
  expression,
  capabilities,
  parseFieldPath,
  depth = 0,
}: {
  expression: string;
  capabilities: QueryCapabilities<FieldType, Operator>;
  parseFieldPath: ReturnType<typeof createJsonSchemaParser>;
  depth?: number;
}): QueryWhere<string[], Operator> | undefined => {
  if (depth > capabilities.limits.depth) {
    return;
  }
  const fields = parseExpressionObject(expression);
  const combinator = fields.has("all")
    ? "all"
    : fields.has("any")
      ? "any"
      : undefined;
  if (combinator !== undefined) {
    if (
      fields.size !== 1 ||
      capabilities.features.combinators.includes(combinator) === false
    ) {
      return;
    }
    const items = parseExpressionArray(fields.get(combinator) ?? "");
    if (items === undefined) {
      return;
    }
    const children = items.map((item) =>
      parseWhere({
        expression: item,
        capabilities,
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
    Array.isArray(field) === false ||
    field.some((segment) => typeof segment !== "string") ||
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
  parseFieldPath,
  depth = 0,
}: {
  where: QueryWhere<string[], Operator>;
  capabilities: QueryCapabilities<FieldType, Operator>;
  parseFieldPath: ReturnType<typeof createJsonSchemaParser>;
  depth?: number;
}): string => {
  if (depth > capabilities.limits.depth) {
    throw new Error("Query filter nesting limit was exceeded");
  }
  if ("field" in where === false) {
    const combinator = "all" in where ? "all" : "any";
    if (capabilities.features.combinators.includes(combinator) === false) {
      throw new Error("Query combinator is unsupported");
    }
    const children = ("all" in where ? where.all : where.any).map((child) =>
      formatWhere({
        where: child,
        capabilities,
        parseFieldPath,
        depth: depth + 1,
      })
    );
    return formatExpressionObject(
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
  return formatExpressionObject(
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
  Query extends StructuredQuery<string[], Operator, Record<string, unknown>>,
>(
  capabilities: QueryCapabilities<FieldType, Operator>
): QuerySourceCodec<Query> => {
  const parseFieldPath = createJsonSchemaParser(
    capabilities.source.fieldPathSchema
  );
  const parameterParsers = new Map(
    capabilities.source.parameters.map((parameter) => [
      parameter.key,
      createJsonSchemaParser(parameter.schema),
    ])
  );
  return {
    parse: (source) => {
      const root = parseExpressionObject(source);
      const queryExpression = root.get(capabilities.source.rootKey);
      if (root.size !== 1 || queryExpression === undefined) {
        return { success: false, message: "Enter a valid query expression." };
      }
      const query = parseExpressionObject(queryExpression);
      const expectedKeys = [
        "where",
        "sort",
        "limit",
        "offset",
        ...capabilities.source.parameters.map(({ key }) => key),
      ];
      if (
        query.size !== expectedKeys.length ||
        expectedKeys.some((key) => query.has(key) === false)
      ) {
        return { success: false, message: "Complete every query field." };
      }
      const whereExpression = query.get("where");
      const sort = parseJsonExpression(query.get("sort"));
      const limit = query.get("limit");
      const offset = query.get("offset");
      const where =
        whereExpression === undefined
          ? undefined
          : parseWhere({
              expression: whereExpression,
              capabilities,
              parseFieldPath,
            });
      const metrics =
        where === undefined ? undefined : getQueryWhereMetrics(where);
      if (
        where === undefined ||
        metrics === undefined ||
        metrics.conditions > capabilities.limits.conditions ||
        metrics.depth > capabilities.limits.depth ||
        Array.isArray(sort) === false ||
        sort.length > capabilities.limits.sortFields ||
        (capabilities.features.sort === false && sort.length > 0) ||
        limit === undefined ||
        offset === undefined ||
        isQueryExpression(limit) === false ||
        isQueryExpression(offset) === false ||
        (capabilities.features.limit === false &&
          limit !== capabilities.defaults.limit) ||
        (capabilities.features.offset === false &&
          offset !== capabilities.defaults.offset)
      ) {
        return { success: false, message: "Enter a valid query expression." };
      }
      const parsedSort = sort.map((item) => {
        if (
          typeof item !== "object" ||
          item === null ||
          Object.keys(item).length !== 2 ||
          !("field" in item) ||
          !("direction" in item) ||
          parseFieldPath(item.field).success === false ||
          (item.direction !== "asc" && item.direction !== "desc")
        ) {
          return;
        }
        return { field: item.field as string[], direction: item.direction };
      });
      if (parsedSort.some((item) => item === undefined)) {
        return { success: false, message: "Enter a valid query sort." };
      }
      const parameters: Record<string, unknown> = {};
      for (const parameter of capabilities.source.parameters) {
        const value = parseJsonExpression(query.get(parameter.key));
        const parsed = parameterParsers.get(parameter.key)?.(value);
        if (parsed === undefined) {
          return { success: false, message: "Query capabilities are invalid." };
        }
        if (parsed.success === false) {
          return {
            success: false,
            message: `Enter a valid ${parameter.label.toLowerCase()}.`,
          };
        }
        parameters[parameter.key] = parsed.data;
      }
      const value = {
        where,
        sort: parsedSort,
        limit,
        offset,
        ...parameters,
      } as Query;
      return { success: true, value };
    },
    format: (query) => {
      const metrics = getQueryWhereMetrics(query.where);
      if (
        metrics.conditions > capabilities.limits.conditions ||
        metrics.depth > capabilities.limits.depth ||
        query.sort.length > capabilities.limits.sortFields ||
        (capabilities.features.sort === false && query.sort.length > 0) ||
        isQueryExpression(query.limit) === false ||
        isQueryExpression(query.offset) === false ||
        (capabilities.features.limit === false &&
          query.limit !== capabilities.defaults.limit) ||
        (capabilities.features.offset === false &&
          query.offset !== capabilities.defaults.offset)
      ) {
        throw new Error("Query limits were exceeded");
      }
      for (const order of query.sort) {
        if (
          parseFieldPath(order.field).success === false ||
          (order.direction !== "asc" && order.direction !== "desc")
        ) {
          throw new Error("Query sort is invalid");
        }
      }
      const fields = new Map<string, string>([
        [
          "where",
          formatWhere({ where: query.where, capabilities, parseFieldPath }),
        ],
        ["sort", JSON.stringify(query.sort)],
        ["limit", query.limit],
        ["offset", query.offset],
      ]);
      for (const parameter of capabilities.source.parameters) {
        const value = query[parameter.key];
        const parsed = parameterParsers.get(parameter.key)?.(value);
        if (parsed === undefined) {
          throw new Error("Query capabilities are invalid");
        }
        if (parsed.success === false) {
          throw new Error(`Query ${parameter.key} is invalid`);
        }
        fields.set(parameter.key, JSON.stringify(parsed.data));
      }
      const expression = formatExpressionObject(fields);
      return formatExpressionObject(
        new Map([[capabilities.source.rootKey, expression]])
      );
    },
  };
};
