import { z } from "zod";
import { isQueryExpression } from "./source";

export const queryFieldPath = z.array(z.string().min(1)).min(1);

export const queryCondition = z.strictObject({
  field: queryFieldPath,
  operator: z.string().min(1),
  value: z.string().min(1),
});

export type QueryWhereInput =
  | z.infer<typeof queryCondition>
  | { all: QueryWhereInput[] }
  | { any: QueryWhereInput[] };

export type QueryWhereValue<Condition> =
  | Condition
  | { all: QueryWhereValue<Condition>[] }
  | { any: QueryWhereValue<Condition>[] };

export const createQueryWhereSchema = <ConditionSchema extends z.ZodType>(
  condition: ConditionSchema
) => {
  type Input = QueryWhereValue<z.input<ConditionSchema>>;
  type Output = QueryWhereValue<z.output<ConditionSchema>>;
  const node: z.ZodType<Output, Input> = z.lazy(() =>
    z.union([
      condition,
      z.strictObject({ all: z.array(node) }),
      z.strictObject({ any: z.array(node) }),
    ])
  );
  return node;
};

export const queryWhere = createQueryWhereSchema(queryCondition);

export const querySort = z.strictObject({
  field: queryFieldPath,
  direction: z.enum(["asc", "desc"]),
});

export const queryField = z.strictObject({
  path: queryFieldPath,
  label: z.string().min(1),
  types: z.array(z.string().min(1)).min(1),
});

export const queryOperator = z.strictObject({
  value: z.string().min(1),
  label: z.string().min(1),
  types: z.array(z.string().min(1)).min(1),
  input: z.strictObject({
    control: z.enum(["expression", "none"]),
    defaultValue: z.string().min(1),
  }),
});

const jsonSchema = z.union([z.boolean(), z.record(z.string(), z.json())]);

const queryNumberControl = z.strictObject({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  optional: z.boolean().optional(),
});

const queryParameter = z.strictObject({
  key: z.string().min(1),
  label: z.string().min(1),
  defaultValue: z.json(),
  schema: jsonSchema,
  control: z.strictObject({
    type: z.literal("variant"),
    discriminator: z.string().min(1),
    options: z
      .array(
        z.strictObject({
          value: z.string().min(1),
          label: z.string().min(1),
          defaultValue: z.record(z.string(), z.json()),
          fields: z.array(queryNumberControl),
        })
      )
      .min(1),
  }),
});

export const queryLimits = z.strictObject({
  conditions: z.number().int().nonnegative(),
  depth: z.number().int().nonnegative(),
  sortFields: z.number().int().nonnegative(),
});

export const queryCapabilities = z
  .strictObject({
    version: z.literal(1),
    fields: z.array(queryField).min(1),
    operators: z.array(queryOperator).min(1),
    features: z.strictObject({
      combinators: z
        .array(z.enum(["all", "any"]))
        .min(1)
        .max(2),
      sort: z.boolean(),
      limit: z.boolean(),
      offset: z.boolean(),
    }),
    limits: queryLimits,
    defaults: z.strictObject({
      condition: queryCondition.omit({ value: true }),
      sort: querySort,
      limit: z.string().min(1),
      offset: z.string().min(1),
    }),
    source: z.strictObject({
      rootKey: z.string().min(1),
      fieldPathSchema: jsonSchema,
      parameters: z.array(queryParameter),
    }),
    labels: z
      .strictObject({
        condition: z.string().min(1).optional(),
        conditionGroup: z.string().min(1).optional(),
        emptyAll: z.string().min(1).optional(),
        emptyAny: z.string().min(1).optional(),
      })
      .optional(),
  })
  .superRefine(
    ({ fields, operators, features, limits, defaults, source }, context) => {
      const fieldPaths = new Set<string>();
      for (const [index, field] of fields.entries()) {
        const key = JSON.stringify(field.path);
        if (fieldPaths.has(key)) {
          context.addIssue({
            code: "custom",
            message: "Query capability fields must have unique paths",
            path: ["fields", index, "path"],
          });
        }
        fieldPaths.add(key);
      }

      const operatorValues = new Set<string>();
      for (const [index, operator] of operators.entries()) {
        if (operatorValues.has(operator.value)) {
          context.addIssue({
            code: "custom",
            message: "Query capability operators must be unique",
            path: ["operators", index, "value"],
          });
        }
        operatorValues.add(operator.value);
        if (isQueryExpression(operator.input.defaultValue) === false) {
          context.addIssue({
            code: "custom",
            message: "Query operator defaults must be valid expressions",
            path: ["operators", index, "input", "defaultValue"],
          });
        }
      }

      if (new Set(features.combinators).size !== features.combinators.length) {
        context.addIssue({
          code: "custom",
          message: "Query capability combinators must be unique",
          path: ["features", "combinators"],
        });
      }
      if (features.sort === false && limits.sortFields !== 0) {
        context.addIssue({
          code: "custom",
          message:
            "Query capabilities without sorting must use a zero sort limit",
          path: ["limits", "sortFields"],
        });
      }
      for (const key of ["limit", "offset"] as const) {
        if (isQueryExpression(defaults[key]) === false) {
          context.addIssue({
            code: "custom",
            message: `The default ${key} must be a valid expression`,
            path: ["defaults", key],
          });
        }
      }
      const defaultConditionField = fields.find(
        (field) =>
          JSON.stringify(field.path) ===
          JSON.stringify(defaults.condition.field)
      );
      if (defaultConditionField === undefined) {
        context.addIssue({
          code: "custom",
          message: "The default condition field must be available",
          path: ["defaults", "condition", "field"],
        });
      }
      const defaultConditionOperator = operators.find(
        (operator) => operator.value === defaults.condition.operator
      );
      if (defaultConditionOperator === undefined) {
        context.addIssue({
          code: "custom",
          message: "The default condition operator must be available",
          path: ["defaults", "condition", "operator"],
        });
      } else if (
        defaultConditionField !== undefined &&
        defaultConditionOperator.types.some((type) =>
          defaultConditionField.types.includes(type)
        ) === false
      ) {
        context.addIssue({
          code: "custom",
          message: "The default condition operator must support its field",
          path: ["defaults", "condition", "operator"],
        });
      }
      if (
        fields.some(
          (field) =>
            JSON.stringify(field.path) === JSON.stringify(defaults.sort.field)
        ) === false
      ) {
        context.addIssue({
          code: "custom",
          message: "The default sort field must be available",
          path: ["defaults", "sort", "field"],
        });
      }
      const parameterKeys = new Set<string>();
      for (const [index, parameter] of source.parameters.entries()) {
        if (
          ["where", "sort", "limit", "offset"].includes(parameter.key) ||
          parameterKeys.has(parameter.key)
        ) {
          context.addIssue({
            code: "custom",
            message: "Query source parameter keys must be unique and non-core",
            path: ["source", "parameters", index, "key"],
          });
        }
        parameterKeys.add(parameter.key);
        let parameterSchema: z.ZodType | undefined;
        try {
          parameterSchema = z.fromJSONSchema(parameter.schema as never);
        } catch {
          context.addIssue({
            code: "custom",
            message: "Query parameter schema must be valid JSON Schema",
            path: ["source", "parameters", index, "schema"],
          });
        }
        if (
          parameterSchema !== undefined &&
          parameterSchema.safeParse(parameter.defaultValue).success === false
        ) {
          context.addIssue({
            code: "custom",
            message: "Query parameter default must match its schema",
            path: ["source", "parameters", index, "defaultValue"],
          });
        }
        const optionValues = new Set<string>();
        for (const [
          optionIndex,
          option,
        ] of parameter.control.options.entries()) {
          if (
            optionValues.has(option.value) ||
            option.defaultValue[parameter.control.discriminator] !==
              option.value ||
            (parameterSchema !== undefined &&
              parameterSchema.safeParse(option.defaultValue).success === false)
          ) {
            context.addIssue({
              code: "custom",
              message:
                "Query parameter options must be unique and match their defaults",
              path: [
                "source",
                "parameters",
                index,
                "control",
                "options",
                optionIndex,
              ],
            });
          }
          optionValues.add(option.value);
          const fieldKeys = option.fields.map(({ key }) => key);
          if (new Set(fieldKeys).size !== fieldKeys.length) {
            context.addIssue({
              code: "custom",
              message: "Query parameter control fields must be unique",
              path: [
                "source",
                "parameters",
                index,
                "control",
                "options",
                optionIndex,
                "fields",
              ],
            });
          }
        }
      }
    }
  );

export const structuredQuery = z.strictObject({
  where: queryWhere,
  sort: z.array(querySort),
  limit: z.string().min(1),
  offset: z.string().min(1),
});
