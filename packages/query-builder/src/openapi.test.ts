import { describe, expect, test } from "vitest";
import {
  getOpenApiQueryDefinition,
  loadOpenApiQueryDefinition,
} from "./openapi";
import { createQuerySourceCodec } from "./source";

describe("OpenAPI query configuration", () => {
  test("loads an external JSON Schema and resolves its local references", async () => {
    const loaded: string[] = [];
    const definition = await loadOpenApiQueryDefinition({
      documentUrl: "https://api.example.com/rest/assets/openapi.json",
      document: {
        paths: {
          "/assets/query": {
            post: {
              operationId: "queryAssets",
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "./query-schema.json" },
                  },
                },
              },
            },
          },
        },
      },
      operationId: "queryAssets",
      loadReference: async (url) => {
        loaded.push(url);
        return {
          type: "object",
          properties: {
            query: { $ref: "#/$defs/Query" },
          },
          required: ["query"],
          $defs: {
            Query: {
              type: "object",
              description: "Only indexed fields appear in autocomplete.",
              properties: {
                limit: { type: "integer", default: 20, minimum: 1 },
              },
            },
          },
        };
      },
    });

    expect(loaded).toEqual([
      "https://api.example.com/rest/assets/query-schema.json",
    ]);
    expect(definition.description).toBe(
      "Only indexed fields appear in autocomplete."
    );
    expect(definition.source.controls).toEqual([
      expect.objectContaining({
        key: "limit",
        defaultValue: "20",
        min: 1,
      }),
    ]);
  });

  test("resolves only own properties in local references", () => {
    expect(() =>
      getOpenApiQueryDefinition({
        document: {
          paths: {
            "/search": {
              get: {
                operationId: "search",
                parameters: [{ $ref: "#/toString" }],
              },
            },
          },
        },
        operationId: "search",
      })
    ).toThrow("OpenAPI reference #/toString is missing");
  });

  test("resolves URI-encoded and array JSON Pointer segments", () => {
    const definition = getOpenApiQueryDefinition({
      document: {
        paths: {
          "/search": {
            get: {
              operationId: "search",
              parameters: [
                { $ref: "#%2Fcomponents%2Fparameters%2F0" },
                { $ref: "#/components/by~1name/limit" },
              ],
            },
          },
        },
        components: {
          parameters: [
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0 },
            },
          ],
          "by/name": {
            limit: {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          },
        },
      },
      operationId: "search",
    });

    expect(definition.source.controls.map(({ key }) => key)).toEqual([
      "offset",
      "limit",
    ]);
  });

  test("rejects circular schema references without overflowing the stack", () => {
    expect(() =>
      getOpenApiQueryDefinition({
        document: {
          paths: {
            "/search": {
              get: {
                operationId: "search",
                parameters: [
                  {
                    name: "cursor",
                    in: "query",
                    schema: { $ref: "#/components/schemas/Cursor" },
                  },
                ],
              },
            },
          },
          components: {
            schemas: {
              Cursor: { $ref: "#/components/schemas/Cursor" },
            },
          },
        },
        operationId: "search",
      })
    ).toThrow("Circular OpenAPI query schema references are unsupported");
  });

  test("derives differently named parameters without vendor metadata", () => {
    const definition = getOpenApiQueryDefinition({
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

    expect(definition.source.controls).toEqual([
      {
        type: "expression",
        key: "perPage",
        label: "Items per page",
        defaultValue: "25",
        input: "number",
        min: 1,
        integer: true,
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

  test("inherits path parameters and lets operation parameters override them", () => {
    const definition = getOpenApiQueryDefinition({
      document: {
        paths: {
          "/articles": {
            parameters: [
              {
                name: "limit",
                in: "query",
                schema: { type: "integer", default: 10 },
              },
              {
                name: "locale",
                in: "header",
                schema: { type: "string", default: "en" },
              },
            ],
            get: {
              operationId: "searchArticles",
              parameters: [
                {
                  name: "limit",
                  in: "query",
                  schema: {
                    type: "integer",
                    default: 25,
                    exclusiveMinimum: 0,
                  },
                },
              ],
            },
          },
        },
      },
      operationId: "searchArticles",
    });

    expect(definition.source.controls).toMatchObject([
      { key: "limit", defaultValue: "25", min: 1 },
      { key: "locale", defaultValue: '"en"' },
    ]);
  });

  test("preserves exclusive numeric bounds and normalizes integer bounds", () => {
    const definition = getOpenApiQueryDefinition({
      document: {
        paths: {
          "/search": {
            get: {
              operationId: "search",
              parameters: [
                {
                  name: "score",
                  in: "query",
                  schema: {
                    type: "number",
                    minimum: 0,
                    exclusiveMinimum: 0.5,
                    maximum: 2,
                    exclusiveMaximum: 1.5,
                  },
                },
                {
                  name: "page",
                  in: "query",
                  schema: {
                    type: "integer",
                    minimum: 0,
                    exclusiveMinimum: 0.5,
                    maximum: 4,
                    exclusiveMaximum: 3.5,
                  },
                },
                {
                  name: "ratio",
                  in: "query",
                  schema: {
                    type: "number",
                    minimum: 1,
                    exclusiveMinimum: 0.5,
                    maximum: 4,
                    exclusiveMaximum: 5,
                  },
                },
                {
                  name: "legacyScore",
                  in: "query",
                  schema: {
                    type: "number",
                    minimum: 0,
                    exclusiveMinimum: true,
                    maximum: 2,
                    exclusiveMaximum: true,
                  },
                },
                {
                  name: "legacyPage",
                  in: "query",
                  schema: {
                    type: "integer",
                    minimum: 0,
                    exclusiveMinimum: true,
                    maximum: 4,
                    exclusiveMaximum: true,
                  },
                },
              ],
            },
          },
        },
      },
      operationId: "search",
    });

    expect(definition.source.controls).toEqual([
      {
        type: "expression",
        key: "score",
        label: "Score",
        defaultValue: "1",
        input: "number",
        min: 0.5,
        max: 1.5,
        exclusiveMin: true,
        exclusiveMax: true,
      },
      {
        type: "expression",
        key: "page",
        label: "Page",
        defaultValue: "1",
        input: "number",
        min: 1,
        max: 3,
        integer: true,
      },
      {
        type: "expression",
        key: "ratio",
        label: "Ratio",
        defaultValue: "1",
        input: "number",
        min: 1,
        max: 4,
      },
      {
        type: "expression",
        key: "legacyScore",
        label: "Legacy Score",
        defaultValue: "1",
        input: "number",
        min: 0,
        max: 2,
        exclusiveMin: true,
        exclusiveMax: true,
      },
      {
        type: "expression",
        key: "legacyPage",
        label: "Legacy Page",
        defaultValue: "1",
        input: "number",
        min: 1,
        max: 3,
        integer: true,
      },
    ]);
  });

  test("does not invent a sort limit when OpenAPI omits maxItems", () => {
    const definition = getOpenApiQueryDefinition({
      document: {
        paths: {
          "/search": {
            post: {
              operationId: "search",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        query: {
                          type: "object",
                          properties: {
                            sort: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  field: {
                                    type: "array",
                                    oneOf: [{ const: ["title"] }],
                                  },
                                  direction: {
                                    oneOf: [
                                      {
                                        const: "newest",
                                        title: "Newest first",
                                      },
                                      {
                                        const: "oldest",
                                        title: "Oldest first",
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          },
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
      operationId: "search",
    });
    expect(definition.source.controls).toEqual([
      {
        type: "sort",
        key: "sort",
        label: "Sort",
        defaultValue: [],
        defaultItem: { field: ["title"], direction: "newest" },
        directions: [
          { value: "newest", label: "Newest first" },
          { value: "oldest", label: "Oldest first" },
        ],
        max: undefined,
      },
    ]);
    const sorts = Array.from({ length: 101 }, () => ({
      field: ["title"],
      direction: "newest",
    }));
    expect(
      createQuerySourceCodec(definition).parse(
        `({ sort: ${JSON.stringify(sorts)} })`
      )
    ).toMatchObject({ success: true });
  });

  test("unwraps a single required object from a referenced request body", () => {
    const definition = getOpenApiQueryDefinition({
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

    expect(definition.source.controls).toEqual([
      {
        type: "expression",
        key: "page",
        label: "Page",
        defaultValue: "1",
        input: "number",
        min: 1,
        integer: true,
      },
    ]);
  });

  test("does not omit required siblings of an object-valued request field", () => {
    expect(() =>
      getOpenApiQueryDefinition({
        document: {
          paths: {
            "/search": {
              post: {
                operationId: "search",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          search: {
                            type: "object",
                            properties: {
                              page: { type: "integer", default: 1 },
                            },
                          },
                          locale: { type: "string" },
                        },
                        required: ["search", "locale"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        operationId: "search",
      })
    ).toThrow();
  });

  test("supports array-valued field choices in variant defaults", () => {
    const defaultValue = {
      mode: "fields",
      fields: [["url"], ["width"]],
    };
    const definition = getOpenApiQueryDefinition({
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
                              title: "Projection",
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

    const codec = createQuerySourceCodec(definition);
    expect(definition.source.controls).toMatchObject([
      {
        label: "Projection",
        config: { selection: { label: "Projection" } },
      },
    ]);
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

  test("renders ordinary discriminated unions as one variant instead of output selection", () => {
    const definition = getOpenApiQueryDefinition({
      document: {
        paths: {
          "/search": {
            post: {
              operationId: "search",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        strategy: {
                          title: "Search strategy",
                          oneOf: [
                            {
                              type: "object",
                              properties: {
                                type: { const: "exact", title: "Exact" },
                                boost: {
                                  $ref: "#/components/schemas/Boost",
                                },
                              },
                              required: ["type"],
                            },
                            {
                              type: "object",
                              properties: {
                                type: { const: "fuzzy", title: "Fuzzy" },
                                distance: { type: "integer", default: 2 },
                              },
                              required: ["type", "distance"],
                            },
                          ],
                        },
                      },
                      required: ["strategy"],
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Boost: { type: "number", default: 1 },
          },
        },
      },
      operationId: "search",
    });

    expect(definition.source.controls).toMatchObject([
      {
        type: "variant",
        key: "strategy",
        label: "Search strategy",
        config: {
          discriminator: "type",
          selection: undefined,
          options: [
            {
              value: "exact",
              defaultValue: { type: "exact", boost: 1 },
              fields: [{ key: "boost", type: "number" }],
            },
            {
              value: "fuzzy",
              fields: [{ key: "distance", type: "number", integer: true }],
            },
          ],
        },
      },
    ]);
  });
});
