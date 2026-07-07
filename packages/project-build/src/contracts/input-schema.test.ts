import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  getInputSchemaMetadata,
  getRuntimeGeneratedInputPaths,
  isHiddenPublicApiInputField,
  runtimeGeneratedIdInputDescription,
} from "./input-schema";

describe("input schema metadata", () => {
  test("derives public JSON input schema from nested Zod objects", () => {
    const metadata = getInputSchemaMetadata(
      z.object({
        pageId: z.string().describe(runtimeGeneratedIdInputDescription),
        values: z.object({
          title: z.string().optional(),
          status: z.number().nullable().optional(),
          meta: z.record(z.string(), z.string()).optional(),
        }),
        updates: z.array(
          z.object({
            instanceId: z.string(),
            value: z.union([
              z.string(),
              z.null(),
              z.object({ type: z.literal("asset"), value: z.string() }),
            ]),
          })
        ),
      }),
      { isHiddenField: isHiddenPublicApiInputField }
    );

    expect(metadata.inputFields).toEqual(["values", "updates"]);
    expect(metadata.requiredInputFields).toEqual(["values", "updates"]);
    expect(metadata.inputFieldTypes).toEqual({ updates: "array" });
    expect(metadata.inputJsonSchema).toMatchObject({
      type: "object",
      properties: {
        values: {
          type: "object",
          properties: {
            title: { type: "string" },
            status: {
              anyOf: [{ type: "number" }, { type: "null" }],
            },
            meta: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
          required: [],
        },
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instanceId: { type: "string" },
              value: {
                anyOf: [
                  { type: "string" },
                  { type: "null" },
                  {
                    type: "object",
                    properties: {
                      type: { type: "string", const: "asset" },
                      value: { type: "string" },
                    },
                  },
                ],
              },
            },
            required: ["instanceId", "value"],
          },
        },
      },
      required: ["values", "updates"],
    });
    expect(metadata.inputJsonSchema.properties).not.toHaveProperty("pageId");
  });

  test("derives additionalProperties from object catchall schemas", () => {
    const metadata = getInputSchemaMetadata(
      z.object({ name: z.string() }).catchall(
        z.object({
          enabled: z.boolean(),
        })
      )
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      additionalProperties: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
        },
        required: ["enabled"],
      },
    });
  });

  test("derives additionalProperties false from strict objects", () => {
    const metadata = getInputSchemaMetadata(
      z.object({ name: z.string() }).strict()
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      additionalProperties: false,
    });
  });

  test("preserves catchall schemas inside intersections", () => {
    const metadata = getInputSchemaMetadata(
      z.object({ projectId: z.string() }).and(
        z.object({ name: z.string() }).catchall(
          z.object({
            enabled: z.boolean(),
          })
        )
      ),
      { isHiddenField: isHiddenPublicApiInputField }
    );

    expect(metadata.inputFields).toEqual(["name"]);
    expect(metadata.requiredInputFields).toEqual(["name"]);
    expect(metadata.inputJsonSchema).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      additionalProperties: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
        },
        required: ["enabled"],
      },
    });
    expect(metadata.inputJsonSchema.properties).not.toHaveProperty("projectId");
  });

  test("derives intersection metadata without duplicating fields", () => {
    const metadata = getInputSchemaMetadata(
      z
        .object({
          pageId: z.string(),
          values: z.object({ title: z.string().optional() }),
        })
        .and(
          z.object({
            values: z.object({
              meta: z.record(z.string(), z.string()).optional(),
            }),
            confirm: z.literal(true),
          })
        ),
      { isHiddenField: isHiddenPublicApiInputField }
    );

    expect(metadata.inputFields).toEqual(["pageId", "values"]);
    expect(metadata.requiredInputFields).toEqual(["pageId", "values"]);
    expect(metadata.inputJsonSchema).toMatchObject({
      allOf: [
        {
          type: "object",
          properties: {
            pageId: { type: "string" },
            values: {
              type: "object",
              properties: {
                title: { type: "string" },
              },
              required: [],
            },
          },
          required: ["pageId", "values"],
        },
        {
          type: "object",
          properties: {
            values: {
              type: "object",
              properties: {
                meta: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
              },
              required: [],
            },
          },
          required: ["values"],
        },
      ],
    });
    expect(metadata.inputJsonSchema.allOf?.[1]).not.toHaveProperty("confirm");
  });

  test("finds generated input paths inside intersections", () => {
    const inputSchema = z
      .object({
        name: z.string(),
      })
      .and(
        z.object({
          pageId: z.string().describe(runtimeGeneratedIdInputDescription),
        })
      );

    expect(getRuntimeGeneratedInputPaths(inputSchema)).toEqual([["pageId"]]);
    expect(
      getInputSchemaMetadata(inputSchema, {
        isHiddenField: isHiddenPublicApiInputField,
      })
    ).toMatchObject({
      inputFields: ["name"],
      requiredInputFields: ["name"],
      inputJsonSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      },
    });
  });

  test("finds generated input paths when wrappers are applied after describe", () => {
    const inputSchema = z.object({
      name: z.string(),
      pageId: z
        .string()
        .describe(runtimeGeneratedIdInputDescription)
        .optional(),
    });

    expect(getRuntimeGeneratedInputPaths(inputSchema)).toEqual([["pageId"]]);
    expect(
      getInputSchemaMetadata(inputSchema, {
        isHiddenField: isHiddenPublicApiInputField,
      })
    ).toMatchObject({
      inputFields: ["name"],
      requiredInputFields: ["name"],
      inputJsonSchema: {
        properties: {
          name: { type: "string" },
        },
      },
    });
  });

  test("finds generated input paths inside unions, records, and tuples", () => {
    const generatedId = z.string().describe(runtimeGeneratedIdInputDescription);

    expect(
      getRuntimeGeneratedInputPaths(
        z.object({
          updates: z.array(
            z.union([
              z.object({
                instanceId: generatedId,
              }),
              z.object({
                name: z.string(),
              }),
            ])
          ),
          values: z.record(z.string(), generatedId),
          tuple: z.tuple([generatedId]),
        })
      )
    ).toEqual([
      ["updates", "*", "instanceId"],
      ["values", "*"],
      ["tuple", "*"],
    ]);
  });

  test("derives fixed tuple JSON schema with prefix items", () => {
    const metadata = getInputSchemaMetadata(
      z.object({
        range: z.tuple([z.string(), z.number()]),
      })
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      properties: {
        range: {
          type: "array",
          prefixItems: [{ type: "string" }, { type: "number" }],
          minItems: 2,
          maxItems: 2,
        },
      },
    });
  });

  test("derives rest tuple JSON schema", () => {
    const metadata = getInputSchemaMetadata(
      z.object({
        values: z.tuple([z.string()]).rest(z.number()),
      })
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      properties: {
        values: {
          type: "array",
          prefixItems: [{ type: "string" }],
          minItems: 1,
          items: { type: "number" },
        },
      },
    });
    expect(metadata.inputJsonSchema.properties?.values).not.toHaveProperty(
      "maxItems"
    );
  });

  test("derives native enum and primitive literal schemas", () => {
    const metadata = getInputSchemaMetadata(
      z.object({
        status: z.enum({ Draft: "draft", Published: "published" }),
        enabled: z.literal(true),
        count: z.literal(2),
      })
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      properties: {
        status: {
          enum: ["draft", "published"],
        },
        enabled: {
          type: "boolean",
          const: true,
        },
        count: {
          type: "number",
          const: 2,
        },
      },
      required: ["status", "enabled", "count"],
    });
  });

  test("derives discriminated union JSON schema", () => {
    const metadata = getInputSchemaMetadata(
      z.object({
        value: z.discriminatedUnion("type", [
          z.object({ type: z.literal("text"), value: z.string() }),
          z.object({ type: z.literal("asset"), value: z.string() }),
        ]),
      })
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      properties: {
        value: {
          oneOf: [
            {
              type: "object",
              properties: {
                type: { type: "string", const: "text" },
                value: { type: "string" },
              },
              required: ["type", "value"],
            },
            {
              type: "object",
              properties: {
                type: { type: "string", const: "asset" },
                value: { type: "string" },
              },
              required: ["type", "value"],
            },
          ],
        },
      },
    });
  });

  test("unwraps effects, defaults, and catch wrappers", () => {
    const metadata = getInputSchemaMetadata(
      z.object({
        count: z.preprocess((value) => value, z.number()),
        optionalWithDefault: z.string().default("fallback"),
        optionalWithCatch: z.string().catch("fallback"),
      })
    );

    expect(metadata.inputJsonSchema).toMatchObject({
      properties: {
        count: { type: "number" },
        optionalWithDefault: { type: "string" },
        optionalWithCatch: { type: "string" },
      },
      required: ["count"],
    });
  });

  test("finds generated input paths through wrappers", () => {
    const generatedId = z.string().describe(runtimeGeneratedIdInputDescription);
    const inputSchema = z.object({
      pageId: generatedId.default("generated"),
      sectionId: z.preprocess((value) => value, generatedId.optional()),
      itemId: generatedId.catch("generated"),
    });

    expect(getRuntimeGeneratedInputPaths(inputSchema)).toEqual([
      ["pageId"],
      ["sectionId"],
      ["itemId"],
    ]);
    expect(
      getInputSchemaMetadata(inputSchema, {
        isHiddenField: isHiddenPublicApiInputField,
      })
    ).toMatchObject({
      inputFields: [],
      requiredInputFields: [],
      inputJsonSchema: {
        properties: {},
        required: [],
      },
    });
  });

  test("preserves nullable wrappers when deriving JSON schema", () => {
    const metadata = getInputSchemaMetadata(
      z
        .object({
          name: z.string(),
        })
        .nullable()
    );

    expect(metadata.inputFields).toEqual(["name"]);
    expect(metadata.requiredInputFields).toEqual([]);
    expect(metadata.inputJsonSchema).toMatchObject({
      anyOf: [
        {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
        {
          type: "null",
        },
      ],
    });
  });
});
