import type { QueryDefinition } from "./types";

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
        limits: { conditions: 8, depth: 3 },
        defaultCondition: { field: ["title"], operator: "eq" },
      },
      {
        type: "sort",
        key: "sort",
        label: "Sort",
        defaultValue: [],
        defaultItem: { field: ["publishedAt"], direction: "desc" },
        directions: [
          { value: "asc", label: "Ascending" },
          { value: "desc", label: "Descending" },
        ],
        max: 2,
      },
      {
        type: "expression",
        key: "limit",
        label: "Limit",
        defaultValue: "10",
        input: "number",
      },
      {
        type: "expression",
        key: "offset",
        label: "Offset",
        defaultValue: "0",
        input: "number",
      },
      {
        type: "variant",
        key: "selection",
        label: "Selection",
        defaultValue: { mode: "summary", includeMetadata: true },
        schema: {
          type: "object",
          properties: {
            mode: { enum: ["summary", "full", "fields"] },
            includeMetadata: { type: "boolean" },
            fields: {
              type: "array",
              items: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
            },
          },
          required: ["mode", "includeMetadata"],
          additionalProperties: false,
        },
        config: {
          discriminator: "mode",
          options: [
            {
              value: "summary",
              label: "Summary",
              defaultValue: { mode: "summary", includeMetadata: true },
              fields: [],
            },
            {
              value: "full",
              label: "Full",
              defaultValue: { mode: "full", includeMetadata: true },
              fields: [],
            },
            {
              value: "fields",
              label: "Fields",
              defaultValue: {
                mode: "fields",
                includeMetadata: true,
                fields: [],
              },
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
} as const satisfies QueryDefinition<"string" | "date", "eq" | "after">;

export type GenericQuery = {
  where: import("./types").QueryWhere<string[], "eq" | "after">;
  sort: import("./types").QuerySort<string[]>[];
  limit: string;
  offset: string;
  selection: {
    mode: "summary" | "full" | "fields";
    includeMetadata: boolean;
    fields?: string[][];
  };
};
