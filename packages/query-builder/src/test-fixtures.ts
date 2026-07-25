import type { QueryCapabilities, StructuredQuery } from "./types";

export const genericQueryCapabilities = {
  version: 1,
  fields: [
    { path: ["title"], label: "Title", types: ["string"] },
    { path: ["publishedAt"], label: "Published at", types: ["date"] },
  ],
  operators: [
    {
      value: "eq",
      label: "Equals",
      types: ["string", "date"],
      input: { control: "expression", defaultValue: '""' },
    },
    {
      value: "after",
      label: "After",
      types: ["date"],
      input: { control: "expression", defaultValue: '"2026-01-01"' },
    },
  ],
  features: {
    combinators: ["all", "any"],
    sort: true,
    limit: true,
    offset: true,
  },
  limits: { conditions: 8, depth: 3, sortFields: 2 },
  defaults: {
    condition: { field: ["title"], operator: "eq" },
    sort: { field: ["publishedAt"], direction: "desc" },
    limit: "10",
    offset: "0",
  },
  source: {
    rootKey: "query",
    fieldPathSchema: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    parameters: [
      {
        key: "selection",
        label: "Selection",
        defaultValue: { mode: "summary" },
        schema: {
          type: "object",
          properties: {
            mode: { enum: ["summary", "full", "fields"] },
            fields: {
              type: "array",
              items: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
            },
          },
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
              defaultValue: { mode: "summary" },
              fields: [],
            },
            {
              value: "full",
              label: "Full",
              defaultValue: { mode: "full" },
              fields: [],
            },
            {
              value: "fields",
              label: "Fields",
              defaultValue: { mode: "fields", fields: [] },
              fields: [
                {
                  key: "fields",
                  label: "Fields",
                  type: "field-list",
                  max: 2,
                },
              ],
            },
          ],
        },
      },
    ],
  },
} as const satisfies QueryCapabilities<"string" | "date", "eq" | "after">;

export type GenericQuery = StructuredQuery<
  string[],
  "eq" | "after",
  {
    selection: {
      mode: "summary" | "full" | "fields";
      fields?: string[][];
    };
  }
>;
