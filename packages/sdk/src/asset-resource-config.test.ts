import { describe, expect, test, vi } from "vitest";
import {
  generateObjectExpression,
  parseExpressionObject,
} from "@webstudio-is/expression";
import {
  createAssetResourceRequest,
  createDefaultStructuredAssetQueryResourceConfiguration,
  createReachableAssetContentCompilationPlan,
  createStructuredAssetQueryResourceBody,
  isAssetsResource,
  parseStructuredAssetQueryResourceBody,
} from "./asset-resource-config";
import { loadResource } from "./resource-loader";
import { assetResourceLimits } from "./asset-resource-limits";
import type { Resource } from "./schema/resources";

const createResource = (overrides: Partial<Resource> = {}): Resource => ({
  id: "posts",
  name: "Posts",
  control: "system",
  method: "post",
  url: '"/$resources/assets"',
  headers: [],
  ...overrides,
});

describe("asset query resource configuration", () => {
  test("creates defaults through the stored query codec", () => {
    const configuration =
      createDefaultStructuredAssetQueryResourceConfiguration();
    expect(
      parseStructuredAssetQueryResourceBody(
        createStructuredAssetQueryResourceBody(configuration)
      )
    ).toEqual(configuration);
  });

  test("enforces runtime limits for static query expressions", () => {
    const configuration =
      createDefaultStructuredAssetQueryResourceConfiguration();

    expect(() =>
      createStructuredAssetQueryResourceBody({
        ...configuration,
        limit: String(assetResourceLimits.resultCount + 1),
      })
    ).toThrow("Query limit is invalid");
    expect(() =>
      createStructuredAssetQueryResourceBody({
        ...configuration,
        offset: String(assetResourceLimits.candidateDocuments + 1),
      })
    ).toThrow("Query offset is invalid");
  });

  test("compiles only Assets queries reachable from bindings", () => {
    const body = createStructuredAssetQueryResourceBody({
      where: { all: [] },
      sort: [],
      limit: "10",
      offset: "0",
      output: { mode: "base", includeMetadata: true },
      content: { mode: "none" },
    });
    expect(
      createReachableAssetContentCompilationPlan({
        props: [
          {
            id: "prop",
            instanceId: "instance",
            name: "posts",
            type: "resource",
            value: "used",
          },
        ],
        dataSources: [],
        resources: [
          createResource({ id: "used", body }),
          createResource({ id: "unused", body }),
        ],
      })?.queries.map(({ id }) => id)
    ).toEqual(["used"]);
    expect(
      createReachableAssetContentCompilationPlan({
        props: [],
        dataSources: [],
        resources: [createResource({ id: "unused", body })],
      })
    ).toBeUndefined();
  });

  test("compiles static JavaScript literals instead of treating them as dynamic", () => {
    const body = createStructuredAssetQueryResourceBody({
      where: {
        all: [
          {
            field: ["properties", "status"],
            operator: "eq",
            value: "'published'",
          },
          {
            field: ["properties", "options"],
            operator: "eq",
            value: "{ featured: true }",
          },
        ],
      },
      sort: [],
      limit: "0x14",
      offset: "0",
      output: { mode: "base", includeMetadata: true },
      content: { mode: "none" },
    });
    const plan = createReachableAssetContentCompilationPlan({
      props: [
        {
          id: "prop",
          instanceId: "instance",
          name: "posts",
          type: "resource",
          value: "posts",
        },
      ],
      dataSources: [],
      resources: [createResource({ body })],
    });

    expect(plan?.queries[0]).toMatchObject({
      where: {
        all: [
          { value: { type: "literal", value: "published" } },
          { value: { type: "literal", value: { featured: true } } },
        ],
      },
      limit: { type: "literal", value: 20 },
    });
  });

  test("rejects invalid reachable Assets query configuration", () => {
    expect(() =>
      createReachableAssetContentCompilationPlan({
        props: [
          {
            id: "prop",
            instanceId: "instance",
            name: "posts",
            type: "resource",
            value: "posts",
          },
        ],
        dataSources: [],
        resources: [createResource({ body: "invalid" })],
      })
    ).toThrow('Assets resource "posts" has an invalid query configuration');
  });

  test("rejects fractional pagination values", () => {
    expect(
      parseStructuredAssetQueryResourceBody(`({
        query: {
          where: { all: [] },
          sort: [],
          limit: 1.5,
          offset: 0,
          output: { mode: "base", includeMetadata: true },
          content: { mode: "none" },
        },
      })`)
    ).toBeUndefined();
  });

  test("serializes a typed Assets query through the resource transport", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
    );
    const resourceRequest = createAssetResourceRequest({
      query: {
        where: {
          all: [
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "hello-world",
            },
          ],
        },
        limit: 1,
      },
      indexRevision: "index-7",
    });

    await loadResource(fetch, resourceRequest, "https://example.com/blog/post");

    expect(fetch).toHaveBeenCalledWith("/$resources/assets", {
      method: "post",
      headers: new Headers([["content-type", "application/json"]]),
      body: JSON.stringify(resourceRequest.body),
    });
  });

  test("only recognizes exact system Assets resource contracts", () => {
    expect(isAssetsResource(createResource())).toBe(true);
    expect(
      isAssetsResource(
        createResource({ method: "get", url: '"/$resources/assets"' })
      )
    ).toBe(false);
    const configured = createResource({ url: '"/$resources/assets"' });
    expect(isAssetsResource(configured)).toBe(true);
    expect(isAssetsResource(createResource({ control: undefined }))).toBe(
      false
    );
    expect(
      isAssetsResource(createResource({ url: '"/$resources/other"' }))
    ).toBe(false);
    expect(
      isAssetsResource(createResource({ url: ' "/$resources/assets"' }))
    ).toBe(false);
  });

  test("round-trips typed filters with Webstudio value expressions", () => {
    const configuration = {
      result: "many" as const,
      where: {
        all: [
          {
            field: ["properties", "slug"],
            operator: "eq" as const,
            value: "$ws$dataSource$routeSlug",
          },
          {
            any: [
              {
                field: ["properties", "draft"],
                operator: "ne" as const,
                value: "true",
              },
              {
                field: ["properties", "id"],
                operator: "eq" as const,
                value: "$ws$dataSource$routeSlug",
              },
            ],
          },
        ],
      },
      sort: [
        {
          field: ["properties", "publishedAt"],
          direction: "desc" as const,
        },
      ],
      limit: "20",
      offset: "$ws$dataSource$offset",
      output: { mode: "all" as const, includeMetadata: true },
      content: { mode: "none" as const },
    };
    const body = createStructuredAssetQueryResourceBody(configuration);

    expect(parseStructuredAssetQueryResourceBody(body)).toEqual(configuration);
    expect(body).toContain("value: $ws$dataSource$routeSlug");
  });

  test("omits pagination from saved single-result queries", () => {
    const configuration =
      createDefaultStructuredAssetQueryResourceConfiguration();
    const body = createStructuredAssetQueryResourceBody({
      ...configuration,
      result: "one",
      limit: "1",
      offset: "4",
    });
    const query = parseExpressionObject(body)?.get("query");
    const fields = parseExpressionObject(query ?? "");

    expect(fields?.has("limit")).toBe(false);
    expect(fields?.has("offset")).toBe(false);
    expect(parseStructuredAssetQueryResourceBody(body)).toMatchObject({
      result: "one",
      limit: String(assetResourceLimits.defaultResultCount),
      offset: "0",
    });
  });

  test("defaults existing serialized queries to many results", () => {
    expect(
      parseStructuredAssetQueryResourceBody(`({ query: {
        where: { all: [] },
        sort: [],
        limit: 1,
        offset: 0,
        output: { mode: "base", includeMetadata: true },
        content: { mode: "none" },
      } })`)
    ).toMatchObject({ result: "many", limit: "1", offset: "0" });
  });

  test("rejects malformed structured resource bodies", () => {
    expect(
      parseStructuredAssetQueryResourceBody('{ "query": { "where": 1 } }')
    ).toBeUndefined();
    const validBody = createStructuredAssetQueryResourceBody({
      where: { all: [] },
      sort: [],
      limit: "20",
      offset: "0",
      output: { mode: "all", includeMetadata: true },
      content: { mode: "none" },
    });
    const query = parseExpressionObject(validBody)?.get("query");
    expect(query).toBeDefined();
    expect(
      parseStructuredAssetQueryResourceBody(
        generateObjectExpression(
          new Map([
            ["query", query ?? ""],
            ["other", "true"],
          ])
        )
      )
    ).toBeUndefined();
    expect(
      parseStructuredAssetQueryResourceBody(`{
        query: {
          where: { all: [] },
          sort: [],
          limit: 20,
          offset: 0,
          output: { mode: "base", includeMetadata: false },
          content: { mode: "none" },
        },
      }`)
    ).toBeUndefined();
    expect(() =>
      createStructuredAssetQueryResourceBody({
        where: { all: [] },
        sort: [],
        limit: "20",
        offset: "0",
        output: { mode: "base", includeMetadata: false },
        content: { mode: "none" },
      })
    ).toThrow("Select at least one asset query output");
  });

  test("preserves explicit output and defaults to URL and optional image dimensions", () => {
    expect(
      parseStructuredAssetQueryResourceBody(`{
        query: {
          where: { all: [] },
          sort: [],
          limit: 20,
          offset: 0,
          output: { mode: "base" },
          content: { mode: "none" },
        },
      }`)
    ).toMatchObject({
      output: { mode: "base", includeMetadata: true },
    });
    expect(
      parseStructuredAssetQueryResourceBody(`{
        query: {
          where: { all: [] },
          sort: [],
          limit: 20,
          offset: 0,
          content: { mode: "none" },
        },
      }`)
    ).toMatchObject({
      output: {
        mode: "fields",
        includeMetadata: false,
        fields: [["url"], ["width"], ["height"]],
      },
    });
  });
});
