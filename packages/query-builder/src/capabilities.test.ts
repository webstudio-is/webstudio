import { describe, expect, test } from "vitest";
import { getCompatibleQueryOperators } from "./query-utils";
import { queryCapabilities } from "./schema";

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
  features: {
    combinators: ["all", "any"],
    sort: true,
    limit: true,
    offset: true,
  },
  limits: { conditions: 20, depth: 4, sortFields: 3 },
  defaults: {
    condition: { field: ["title"], operator: "eq" },
    sort: { field: ["title"], direction: "asc" },
    limit: "20",
    offset: "0",
  },
  source: {
    rootKey: "query",
    fieldPathSchema: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    parameters: [],
  },
} as const;

describe("query capabilities", () => {
  test("validates a provider-neutral capability document", () => {
    expect(queryCapabilities.parse(capabilities)).toEqual(capabilities);
  });

  test("rejects duplicate fields, operators, and combinators", () => {
    expect(
      queryCapabilities.safeParse({
        ...capabilities,
        fields: [...capabilities.fields, capabilities.fields[0]],
        operators: [...capabilities.operators, capabilities.operators[0]],
        features: { ...capabilities.features, combinators: ["all", "all"] },
      }).success
    ).toBe(false);
  });

  test("rejects a nonzero sort limit when sorting is unsupported", () => {
    expect(
      queryCapabilities.safeParse({
        ...capabilities,
        features: { ...capabilities.features, sort: false },
      }).success
    ).toBe(false);
  });

  test("rejects defaults that the declared fields and operators cannot use", () => {
    expect(
      queryCapabilities.safeParse({
        ...capabilities,
        defaults: {
          ...capabilities.defaults,
          condition: { field: ["missing"], operator: "missing" },
          sort: { field: ["missing"], direction: "asc" },
        },
      }).success
    ).toBe(false);
  });

  test("rejects defaults that are not valid expressions", () => {
    expect(
      queryCapabilities.safeParse({
        ...capabilities,
        operators: [
          {
            ...capabilities.operators[0],
            input: { control: "expression", defaultValue: "(" },
          },
          ...capabilities.operators.slice(1),
        ],
        defaults: { ...capabilities.defaults, limit: "(" },
      }).success
    ).toBe(false);
  });

  test("rejects parameter controls that disagree with their JSON Schema", () => {
    expect(
      queryCapabilities.safeParse({
        ...capabilities,
        source: {
          ...capabilities.source,
          parameters: [
            {
              key: "selection",
              label: "Selection",
              defaultValue: { mode: "invalid" },
              schema: {
                type: "object",
                properties: { mode: { const: "summary" } },
                required: ["mode"],
                additionalProperties: false,
              },
              control: {
                type: "variant",
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

  test("selects operators compatible with any observed field type", () => {
    expect(
      getCompatibleQueryOperators(
        ["string", "number"],
        capabilities.operators
      ).map(({ value }) => value)
    ).toEqual(["eq", "contains", "gt"]);
  });
});
