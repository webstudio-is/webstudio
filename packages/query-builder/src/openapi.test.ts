import { describe, expect, test } from "vitest";
import { getOpenApiQueryConfiguration } from "./openapi";

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
});
