import { expect, test } from "vitest";
import {
  getInputJsonSchemaAdditionalProperties,
  getInputJsonSchemaMetadata,
  getInputJsonSchemaProperties,
  inputJsonSchemaAcceptsType,
  type InputJsonSchema,
} from "./input-json-schema";

test("derives field summaries from JSON input schemas", () => {
  expect(
    getInputJsonSchemaMetadata({
      type: "object",
      properties: {
        title: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        variants: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        pair: {
          allOf: [
            { type: "array", items: { type: "string" } },
            { minItems: 2 },
          ],
        },
      },
      required: ["title", "tags"],
    })
  ).toEqual({
    inputFields: ["title", "tags", "variants", "pair"],
    requiredInputFields: ["title", "tags"],
    inputFieldTypes: {
      tags: "array",
      variants: "array",
      pair: "array",
    },
  });
});

test("derives field summaries through JSON schema branches", () => {
  expect(
    getInputJsonSchemaMetadata({
      allOf: [
        {
          properties: {
            title: { type: "string" },
          },
          required: ["title"],
        },
        {
          properties: {
            tags: { type: "array", items: { type: "string" } },
          },
        },
      ],
    })
  ).toEqual({
    inputFields: ["title", "tags"],
    requiredInputFields: ["title"],
    inputFieldTypes: {
      tags: "array",
    },
  });
});

test("does not require fields that are only required by some anyOf branches", () => {
  expect(
    getInputJsonSchemaMetadata({
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        kind: { type: "string" },
      },
      anyOf: [{ required: ["title", "kind"] }, { required: ["slug", "kind"] }],
    })
  ).toEqual({
    inputFields: ["title", "slug", "kind"],
    requiredInputFields: ["kind"],
    inputFieldTypes: {},
  });
});

test("can treat unconstrained schemas as accepting structured JSON", () => {
  expect(inputJsonSchemaAcceptsType({}, "array")).toBe(false);
  expect(
    inputJsonSchemaAcceptsType({}, "array", {
      treatUnconstrainedAsAny: true,
    })
  ).toBe(true);
  expect(
    inputJsonSchemaAcceptsType(
      { description: "Any JSON value.", default: {} },
      "object",
      {
        treatUnconstrainedAsAny: true,
      }
    )
  ).toBe(true);
  expect(
    inputJsonSchemaAcceptsType({ format: "uri" } as InputJsonSchema, "object", {
      treatUnconstrainedAsAny: true,
    })
  ).toBe(false);
});

test("does not treat empty allOf schemas as every JSON type", () => {
  expect(inputJsonSchemaAcceptsType({ allOf: [] }, "array")).toBe(false);
  expect(inputJsonSchemaAcceptsType({ allOf: [] }, "object")).toBe(false);
});

test("does not require fields from empty anyOf branches", () => {
  expect(
    getInputJsonSchemaMetadata({
      properties: {
        title: { type: "string" },
      },
      anyOf: [],
    }).requiredInputFields
  ).toEqual([]);
});

test("collects properties through JSON schema branches", () => {
  expect(
    getInputJsonSchemaProperties({
      properties: {
        title: { type: "string" },
        settings: { type: "string" },
      },
      allOf: [
        {
          properties: {
            settings: { type: "object" },
            enabled: { type: "boolean" },
          },
        },
      ],
    })
  ).toEqual({
    title: { type: "string" },
    settings: {
      allOf: [{ type: "string" }, { type: "object" }],
    },
    enabled: { type: "boolean" },
  });
});

test("collects additionalProperties schemas through JSON schema branches", () => {
  expect(
    getInputJsonSchemaAdditionalProperties({
      additionalProperties: true,
      allOf: [
        {
          additionalProperties: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
        },
      ],
    })
  ).toEqual({
    allOf: [
      {},
      {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
        },
      },
    ],
  });
});
