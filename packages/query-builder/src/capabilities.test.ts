import { describe, expect, test } from "vitest";
import { getCompatibleQueryOperators } from "./query-utils";
import { queryDefinition } from "./schema";

const capabilities = {
  version: 1,
  fields: [{ path: ["title"], label: "Title", types: ["string"] }],
  operators: [
    {
      value: "eq",
      label: "Equals",
      types: ["string", "number"],
      input: { control: "expression", defaultValue: '""' },
    },
    {
      value: "contains",
      label: "Contains",
      types: ["string"],
      input: { control: "expression", defaultValue: '""' },
    },
    {
      value: "gt",
      label: "Greater than",
      types: ["number"],
      input: { control: "expression", defaultValue: "0" },
    },
  ],
  source: {
    fieldPathSchema: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    controls: [
      {
        type: "filter",
        key: "where",
        label: "Filters",
        defaultValue: { all: [] },
        combinators: ["all", "any"],
        limits: { conditions: 20, depth: 4 },
        defaultCondition: { field: ["title"], operator: "eq" },
      },
      {
        type: "sort",
        key: "sort",
        label: "Sort",
        defaultValue: [],
        defaultItem: { field: ["title"], direction: "asc" },
        max: 3,
      },
      {
        type: "expression",
        key: "pageSize",
        label: "Page size",
        defaultValue: "20",
        input: "number",
      },
    ],
  },
} as const;

describe("query capabilities", () => {
  test("validates a provider-neutral capability document", () => {
    expect(queryDefinition.parse(capabilities)).toEqual(capabilities);
  });

  test("rejects duplicate fields, operators, and combinators", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        fields: [...capabilities.fields, capabilities.fields[0]],
        operators: [...capabilities.operators, capabilities.operators[0]],
        source: {
          ...capabilities.source,
          controls: capabilities.source.controls.map((control) =>
            control.type === "filter"
              ? { ...control, combinators: ["all", "all"] }
              : control
          ),
        },
      }).success
    ).toBe(false);
  });

  test("accepts definitions without sorting", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        source: {
          ...capabilities.source,
          controls: capabilities.source.controls.filter(
            (control) => control.type !== "sort"
          ),
        },
      }).success
    ).toBe(true);
  });

  test("rejects defaults that the declared fields and operators cannot use", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        source: {
          ...capabilities.source,
          controls: capabilities.source.controls.map((control) =>
            control.type === "filter"
              ? {
                  ...control,
                  defaultCondition: {
                    field: ["missing"],
                    operator: "missing",
                  },
                }
              : control
          ),
        },
      }).success
    ).toBe(false);
  });

  test("rejects defaults that are not valid expressions", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        operators: [
          {
            ...capabilities.operators[0],
            input: { control: "expression", defaultValue: "(" },
          },
          ...capabilities.operators.slice(1),
        ],
        source: {
          ...capabilities.source,
          controls: capabilities.source.controls.map((control) =>
            control.type === "expression"
              ? { ...control, defaultValue: "(" }
              : control
          ),
        },
      }).success
    ).toBe(false);
  });

  test("rejects parameter controls that disagree with their JSON Schema", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        source: {
          ...capabilities.source,
          controls: [
            {
              type: "variant",
              key: "selection",
              label: "Selection",
              defaultValue: { mode: "invalid" },
              schema: {
                type: "object",
                properties: { mode: { const: "summary" } },
                required: ["mode"],
                additionalProperties: false,
              },
              config: {
                discriminator: "mode",
                options: [
                  {
                    value: "summary",
                    label: "Summary",
                    defaultValue: { mode: "invalid" },
                    fields: [],
                  },
                ],
              },
            },
          ],
        },
      }).success
    ).toBe(false);
  });

  test("rejects selection controls without their declared empty option", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        source: {
          ...capabilities.source,
          controls: [
            {
              type: "variant",
              key: "selection",
              label: "Selection",
              defaultValue: { mode: "summary" },
              schema: true,
              config: {
                discriminator: "mode",
                selection: { label: "Select", emptyOption: "missing" },
                options: [
                  {
                    value: "summary",
                    label: "Summary",
                    defaultValue: { mode: "summary" },
                    fields: [],
                  },
                ],
              },
            },
          ],
        },
      }).success
    ).toBe(false);
  });

  test("rejects selection baselines without a boolean option value", () => {
    expect(
      queryDefinition.safeParse({
        ...capabilities,
        source: {
          ...capabilities.source,
          controls: [
            {
              type: "variant",
              key: "selection",
              label: "Selection",
              defaultValue: { mode: "summary" },
              schema: true,
              config: {
                discriminator: "mode",
                selection: {
                  label: "Output",
                  emptyOption: "summary",
                  baseline: { key: "includeMetadata", label: "Metadata" },
                },
                options: [
                  {
                    value: "summary",
                    label: "Summary",
                    defaultValue: { mode: "summary" },
                    fields: [],
                  },
                ],
              },
            },
          ],
        },
      }).success
    ).toBe(false);
  });

  test("selects operators compatible with any observed field type", () => {
    expect(
      getCompatibleQueryOperators(
        ["string", "number"],
        capabilities.operators
      ).map(({ value }) => value)
    ).toEqual(["eq", "contains", "gt"]);
  });
});
