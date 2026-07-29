import { z } from "zod";
import { isQueryExpression } from "./source";
import { getQueryFieldKey } from "./query-utils";
import type { QueryWhereTree } from "./types";

const fieldPath = z.array(z.string().min(1)).min(1);
const condition = z.strictObject({
  field: fieldPath,
  operator: z.string().min(1),
  value: z.string().min(1),
});

export const createQueryWhereSchema = <ConditionSchema extends z.ZodType>(
  conditionSchema: ConditionSchema,
  options: { maximumChildren?: number } = {}
) => {
  type Input = QueryWhereTree<z.input<ConditionSchema>>;
  type Output = QueryWhereTree<z.output<ConditionSchema>>;
  const createNode = (child: z.ZodType<Output, Input>) => {
    const children = z.array(child);
    const boundedChildren =
      options.maximumChildren === undefined
        ? children
        : children.max(options.maximumChildren);
    return z.union([
      conditionSchema,
      z.strictObject({ all: boundedChildren }),
      z.strictObject({ any: boundedChildren }),
    ]);
  };
  const node: z.ZodType<Output, Input> = z.lazy(() => createNode(node));
  return node;
};

const sortItem = z.strictObject({
  field: fieldPath,
  direction: z.enum(["asc", "desc"]),
});
const jsonSchema = z.union([z.boolean(), z.record(z.string(), z.json())]);
const parameterField = z.discriminatedUnion("type", [
  z.strictObject({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.literal("number"),
    min: z.number().optional(),
    max: z.number().optional(),
    optional: z.boolean().optional(),
  }),
  z.strictObject({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.literal("field-list"),
    max: z.number().int().positive().optional(),
  }),
]);
const variantConfig = z.strictObject({
  discriminator: z.string().min(1),
  selection: z
    .strictObject({
      label: z.string().min(1),
      emptyOption: z.string().min(1),
      baseline: z
        .strictObject({ key: z.string().min(1), label: z.string().min(1) })
        .optional(),
    })
    .optional(),
  options: z
    .array(
      z.strictObject({
        value: z.string().min(1),
        label: z.string().min(1),
        defaultValue: z.record(z.string(), z.json()),
        fields: z.array(parameterField),
      })
    )
    .min(1),
});

const control = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("filter"),
    key: z.string().min(1),
    label: z.string().min(1),
    defaultValue: createQueryWhereSchema(condition),
    combinators: z
      .array(z.enum(["all", "any"]))
      .min(1)
      .max(2),
    limits: z.strictObject({
      conditions: z.number().int().nonnegative(),
      depth: z.number().int().nonnegative(),
    }),
    defaultCondition: condition.omit({ value: true }),
    labels: z
      .strictObject({
        condition: z.string().min(1).optional(),
        conditionGroup: z.string().min(1).optional(),
      })
      .optional(),
  }),
  z.strictObject({
    type: z.literal("sort"),
    key: z.string().min(1),
    label: z.string().min(1),
    defaultValue: z.array(sortItem),
    defaultItem: sortItem,
    max: z.number().int().nonnegative(),
  }),
  z.strictObject({
    type: z.literal("expression"),
    key: z.string().min(1),
    label: z.string().min(1),
    defaultValue: z.string().min(1),
    input: z.enum(["number", "expression"]),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.strictObject({
    type: z.literal("variant"),
    key: z.string().min(1),
    label: z.string().min(1),
    defaultValue: z.json(),
    schema: jsonSchema,
    config: variantConfig,
  }),
]);

export const queryDefinition = z
  .strictObject({
    version: z.literal(1),
    fields: z.array(
      z.strictObject({
        path: fieldPath,
        label: z.string().min(1),
        types: z.array(z.string().min(1)).min(1),
        operators: z.array(z.string().min(1)).optional(),
      })
    ),
    operators: z.array(
      z.strictObject({
        value: z.string().min(1),
        label: z.string().min(1),
        types: z.array(z.string().min(1)).min(1),
        input: z.strictObject({
          control: z.enum(["expression", "none"]),
          defaultValue: z.string().min(1),
        }),
      })
    ),
    source: z.strictObject({
      fieldPathSchema: jsonSchema,
      controls: z.array(control).min(1),
    }),
  })
  .superRefine(({ fields, operators, source }, context) => {
    const fieldKeys = fields.map(({ path }) => getQueryFieldKey(path));
    if (new Set(fieldKeys).size !== fieldKeys.length) {
      context.addIssue({ code: "custom", message: "Fields must be unique" });
    }
    const operatorValues = operators.map(({ value }) => value);
    if (new Set(operatorValues).size !== operatorValues.length) {
      context.addIssue({ code: "custom", message: "Operators must be unique" });
    }
    for (const [index, operator] of operators.entries()) {
      if (isQueryExpression(operator.input.defaultValue) === false) {
        context.addIssue({
          code: "custom",
          message: "Operator defaults must be expressions",
          path: ["operators", index, "input", "defaultValue"],
        });
      }
    }
    const keys = source.controls.map(({ key }) => key);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Control keys must be unique",
      });
    }
    for (const [index, item] of source.controls.entries()) {
      if (
        item.type === "expression" &&
        isQueryExpression(item.defaultValue) === false
      ) {
        context.addIssue({
          code: "custom",
          message: "Expression defaults must be valid expressions",
          path: ["source", "controls", index, "defaultValue"],
        });
      }
      if (item.type === "filter") {
        if (new Set(item.combinators).size !== item.combinators.length) {
          context.addIssue({
            code: "custom",
            message: "Combinators must be unique",
          });
        }
        if (
          fieldKeys.includes(getQueryFieldKey(item.defaultCondition.field)) ===
          false
        ) {
          context.addIssue({
            code: "custom",
            message: "Default filter field is unavailable",
          });
        }
        if (operatorValues.includes(item.defaultCondition.operator) === false) {
          context.addIssue({
            code: "custom",
            message: "Default filter operator is unavailable",
          });
        }
      }
      if (
        item.type === "sort" &&
        fieldKeys.includes(getQueryFieldKey(item.defaultItem.field)) === false
      ) {
        context.addIssue({
          code: "custom",
          message: "Default sort field is unavailable",
        });
      }
      if (item.type === "variant") {
        let parser: z.ZodType | undefined;
        try {
          parser = z.fromJSONSchema(item.schema as never);
        } catch {
          context.addIssue({
            code: "custom",
            message: "Control JSON Schema is invalid",
          });
        }
        if (parser?.safeParse(item.defaultValue).success === false) {
          context.addIssue({
            code: "custom",
            message: "Control default does not match its schema",
          });
        }
        const optionValues = item.config.options.map(({ value }) => value);
        if (new Set(optionValues).size !== optionValues.length) {
          context.addIssue({
            code: "custom",
            message: "Variant options must be unique",
          });
        }
        for (const option of item.config.options) {
          if (
            option.defaultValue[item.config.discriminator] !== option.value ||
            parser?.safeParse(option.defaultValue).success === false
          ) {
            context.addIssue({
              code: "custom",
              message: "Variant option default is invalid",
            });
          }
          const fieldKeys = option.fields.map(({ key }) => key);
          if (new Set(fieldKeys).size !== fieldKeys.length) {
            context.addIssue({
              code: "custom",
              message: "Variant option fields must be unique",
            });
          }
        }
        const selection = item.config.selection;
        if (
          selection !== undefined &&
          optionValues.includes(selection.emptyOption) === false
        ) {
          context.addIssue({
            code: "custom",
            message: "Selection empty option is unavailable",
          });
        }
        if (
          selection?.baseline !== undefined &&
          item.config.options.some(
            (option) =>
              typeof option.defaultValue[selection.baseline?.key ?? ""] !==
              "boolean"
          )
        ) {
          context.addIssue({
            code: "custom",
            message: "Selection baseline must reference a boolean",
          });
        }
      }
    }
  });
