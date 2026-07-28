import { describe, expect, test } from "vitest";
import { getOpenApiQueryConfiguration } from "./openapi";
import { createQuerySourceCodec } from "./source";

describe("OpenAPI query configuration", () => {
  test("derives differently named parameters without vendor metadata", () => {
    const configuration = getOpenApiQueryConfiguration({
      document: {
        openapi: "3.1.1",
        paths: {
          "/articles": {
            get: {
              operationId: "searchArticles",
              parameters: [
                {
                  name: "perPage",
                  in: "query",
                  schema: {
                    type: "integer",
                    title: "Items per page",
                    default: 25,
                    minimum: 1,
                  },
                },
                {
                  $ref: "#/components/parameters/Cursor",
                },
              ],
            },
          },
        },
        components: {
          parameters: {
            Cursor: {
              name: "cursor",
              in: "query",
              schema: { type: "string", default: "" },
            },
          },
        },
      },
      operationId: "searchArticles",
    });

    expect(configuration.valuePath).toEqual([]);
    expect(configuration.parameters).toEqual([
      { key: "perPage", in: "query" },
      { key: "cursor", in: "query" },
    ]);
    expect(configuration.definition.source.controls).toEqual([
      {
        type: "expression",
        key: "perPage",
        label: "Items per page",
        defaultValue: "25",
        input: "number",
        min: 1,
      },
      {
        type: "expression",
        key: "cursor",
        label: "Cursor",
        defaultValue: '""',
        input: "expression",
      },
    ]);
  });

  test("unwraps a single required object from a referenced request body", () => {
    const configuration = getOpenApiQueryConfiguration({
      document: {
        paths: {
          "/search": {
            post: {
              operationId: "search",
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/SearchRequest" },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            SearchRequest: {
              type: "object",
              properties: {
                search: {
                  type: "object",
                  properties: {
                    page: { type: "integer", default: 1, minimum: 1 },
                  },
                },
                traceId: { type: "string" },
              },
              required: ["search"],
            },
          },
        },
      },
      operationId: "search",
    });

    expect(configuration.valuePath).toEqual(["search"]);
    expect(configuration.definition.source.controls).toEqual([
      {
        type: "expression",
        key: "page",
        label: "Page",
        defaultValue: "1",
        input: "number",
        min: 1,
      },
    ]);
  });

  test("supports array-valued field choices in variant defaults", () => {
    const defaultValue = {
      mode: "fields",
      fields: [["url"], ["width"]],
    };
    const configuration = getOpenApiQueryConfiguration({
      document: {
        paths: {
          "/assets": {
            post: {
              operationId: "queryAssets",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        query: {
                          type: "object",
                          properties: {
                            output: {
                              default: defaultValue,
                              oneOf: [
                                {
                                  type: "object",
                                  properties: {
                                    mode: { const: "base" },
                                  },
                                  required: ["mode"],
                                  additionalProperties: false,
                                },
                                {
                                  type: "object",
                                  properties: {
                                    mode: { const: "fields" },
                                    fields: {
                                      type: "array",
                                      items: {
                                        type: "array",
                                        minItems: 1,
                                        items: { type: "string" },
                                        oneOf: [
                                          { const: ["url"], title: "URL" },
                                          {
                                            const: ["width"],
                                            title: "Width",
                                          },
                                        ],
                                      },
                                    },
                                  },
                                  required: ["mode", "fields"],
                                  additionalProperties: false,
                                },
                              ],
                            },
                          },
                          required: ["output"],
                        },
                      },
                      required: ["query"],
                    },
                  },
                },
              },
            },
          },
        },
      },
      operationId: "queryAssets",
    });

    const codec = createQuerySourceCodec(configuration.definition);
    const source = codec.format({ output: defaultValue });
    expect(codec.parse(source)).toEqual({
      success: true,
      value: { output: defaultValue },
    });
    expect(
      codec.parse(`({ output: { mode: "fields", fields: [["height"]] } })`)
        .success
    ).toBe(false);
  });
});
