import { describe, expect, test } from "vitest";
import {
  ROOT_INSTANCE_ID,
  type DataSource,
  type Page,
  type Pages,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import { builderNamespaces } from "../contracts/namespaces";
import { searchProject } from "./project-search";
import { runtimeOutputSchemas } from "./output-schemas";
import { executeBuilderRuntimeOperation } from "./registry";
import {
  context,
  expectRuntimeValidationError,
  state,
} from "./runtime.test-fixtures";

describe("project search", () => {
  test("searches every Builder namespace with stable structured locations", () => {
    const searchableState = {
      ...state,
      projectSettings: {
        meta: { siteName: "Needle project" },
        compiler: {},
      },
      marketplaceProduct: {
        category: "pageTemplates" as const,
        name: "Needle marketplace product",
        thumbnailAssetId: "asset",
        author: "Webstudio",
        email: "hello@webstudio.is",
        website: "https://webstudio.is",
        issues: "",
        description: "A marketplace product used to verify project search.",
      },
    };

    const result = searchProject(searchableState, {
      query: "needle",
      limit: 200,
    });

    expect(result.namespaces).toEqual(builderNamespaces);
    expect(result.matches).toEqual([
      expect.objectContaining({
        matchId:
          'project-match:v2:["projectSettings","value","meta","siteName"]',
        currentValue: "Needle project",
        location: {
          namespace: "projectSettings",
          path: ["meta", "siteName"],
        },
      }),
      expect.objectContaining({
        matchId: 'project-match:v2:["marketplaceProduct","value","name"]',
        currentValue: "Needle marketplace product",
        location: {
          namespace: "marketplaceProduct",
          path: ["name"],
        },
      }),
    ]);

    const queryByNamespace = {
      pages: "Post description",
      instances: "Hero",
      props: "Heading label",
      styles: "brand-color",
      styleSources: "Brand",
      styleSourceSelections: "token",
      dataSources: "Title",
      resources: "/posts",
      assets: "next.png",
      assetFolders: "Media",
      breakpoints: "Desktop",
      projectSettings: "Needle project",
      marketplaceProduct: "Needle marketplace product",
    } satisfies Record<(typeof builderNamespaces)[number], string>;
    for (const namespace of builderNamespaces) {
      expect(
        searchProject(searchableState, {
          query: queryByNamespace[namespace],
          namespaces: [namespace],
        }).total,
        namespace
      ).toBeGreaterThan(0);
    }

    expect(
      searchProject(searchableState, {
        query: "media",
        namespaces: ["assetFolders"],
      })
    ).toMatchObject({
      namespaces: ["assetFolders"],
      total: 1,
      matches: [
        {
          currentValue: "Media",
          entity: { type: "assetFolder", id: "asset-folder" },
          location: {
            namespace: "assetFolders",
            path: ["asset-folder", "name"],
          },
        },
      ],
    });
  });

  test("returns page impact, references, and deterministic pagination", () => {
    const firstPage = searchProject(state, { query: "heading", limit: 2 });
    const firstPageAgain = searchProject(state, { query: "heading", limit: 2 });

    expect(firstPage).toEqual(firstPageAgain);
    expect(firstPage.matches).toHaveLength(2);
    expect(firstPage.nextCursor).toBe("2");
    expect(
      searchProject(state, {
        query: "heading",
        cursor: firstPage.nextCursor ?? undefined,
        limit: 2,
      }).matches
    ).not.toEqual(firstPage.matches);

    expect(
      searchProject(state, {
        query: "resource",
        namespaces: ["props"],
      })
    ).toMatchObject({
      matches: expect.arrayContaining([
        expect.objectContaining({
          currentValue: "resource",
          location: {
            namespace: "props",
            path: ["resourceProp", "value"],
          },
          pageIds: ["home"],
          pagePaths: ["/"],
          reference: {
            namespace: "resources",
            entityType: "resource",
            id: "resource",
            resolved: true,
          },
        }),
      ]),
    });
  });

  test("keeps the scopes filter compatible", () => {
    expect(
      searchProject(state, { query: "posts", scopes: ["resources"] })
    ).toMatchObject({
      namespaces: ["resources"],
      scopes: ["resources"],
      total: 1,
      matches: [
        {
          kind: "resource",
          resourceId: "resource",
          name: "Posts",
          method: "get",
          url: '"/posts"',
        },
      ],
    });

    expect(
      searchProject(state, { query: "Hero", scopes: ["assets"] })
    ).toMatchObject({
      total: 1,
      matches: [{ kind: "asset", assetId: "next" }],
    });

    expectRuntimeValidationError("project.search", {});
    expectRuntimeValidationError("project.search", {
      query: "button",
      scopes: ["accessibility"],
    });
    expectRuntimeValidationError("project.search", {
      query: "button",
      namespaces: ["props"],
      scopes: ["props"],
    });
    expectRuntimeValidationError("project.search", {
      query: "button",
      pagePat: "/pricing",
    });
  });

  test("rejects unknown page selectors instead of widening the search", () => {
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "project.search",
        state,
        input: { query: "Heading", pagePath: "/does-not-exist" },
        context,
      })
    ).toThrowError(
      expect.objectContaining({ code: "NOT_FOUND", message: "Page not found" })
    );
  });

  test("excludes credential values", () => {
    const home = state.pages?.pages.get("home");
    if (home === undefined) {
      throw new Error("Home page fixture is missing");
    }
    const securedHome: Page = {
      ...home,
      meta: {
        ...home.meta,
        auth: {
          method: "basic",
          login: "preview-user",
          password: "secret-password",
        },
      },
    };
    const pages: Pages = {
      ...state.pages,
      pages: new Map<string, Page>(
        [...state.pages.pages].map(([id, page]) => [id, page as Page])
      ).set("home", securedHome),
    };

    const props = new Map<string, Prop>(state.props);
    props.set("secret-prop", {
      id: "secret-prop",
      instanceId: "heading",
      name: "apiToken",
      type: "string",
      value: "secret-password",
    });

    expect(
      searchProject({ ...state, pages, props }, { query: "secret-password" })
    ).toMatchObject({ total: 0, excludedSensitiveValueCount: 4 });
    expect(
      searchProject(
        { ...state, pages, props },
        { query: "secret-password", scopes: ["props"] }
      )
    ).toMatchObject({ total: 0, excludedSensitiveValueCount: 1 });
  });

  test("searches stable Map identifiers and JSON keys", () => {
    const props = new Map<string, Prop>(state.props);
    props.set("json-prop", {
      id: "json-prop",
      instanceId: "heading",
      name: "data",
      type: "json",
      value: { campaignCode: "spring" },
    });
    props.set("json-array-prop", {
      id: "json-array-prop",
      instanceId: "heading",
      name: "items",
      type: "json",
      value: [
        { id: "duplicate-id", value: "first" },
        { id: "duplicate-id", value: "second" },
      ],
    });

    expect(
      searchProject(state, {
        query: "local:base::color",
        namespaces: ["styles"],
      })
    ).toMatchObject({
      total: 1,
      matches: [
        expect.objectContaining({
          matchType: "key",
          currentValue: "local:base::color",
          entity: { type: "style", id: "local:base::color" },
        }),
      ],
    });
    const duplicateIdMatches = searchProject(
      { ...state, props },
      { query: "duplicate-id", namespaces: ["props"] }
    ).matches as Array<{ matchId: string }>;
    expect(new Set(duplicateIdMatches.map(({ matchId }) => matchId)).size).toBe(
      duplicateIdMatches.length
    );
    expect(
      searchProject(
        { ...state, props },
        {
          query: "campaignCode",
          namespaces: ["props"],
        }
      )
    ).toMatchObject({
      total: 1,
      matches: [
        expect.objectContaining({
          matchType: "key",
          currentValue: "campaignCode",
          location: {
            namespace: "props",
            path: ["json-prop", "value", "campaignCode"],
          },
        }),
      ],
    });
  });

  test("keeps array match ids stable when unrelated items are inserted", () => {
    const pages = {
      ...state.pages,
      redirects: [
        { old: "/first", new: "/one", status: "301" as const },
        { old: "/second", new: "/two", status: "301" as const },
      ],
    };
    const match = searchProject(
      { ...state, pages },
      { query: "/second", namespaces: ["pages"] }
    ).matches[0] as
      | { matchId: string; location: { path: Array<string | number> } }
      | undefined;
    const shiftedMatch = searchProject(
      {
        ...state,
        pages: {
          ...pages,
          redirects: [
            { old: "/inserted", new: "/new", status: "302" as const },
            ...pages.redirects,
          ],
        },
      },
      { query: "/second", namespaces: ["pages"] }
    ).matches[0] as
      | { matchId: string; location: { path: Array<string | number> } }
      | undefined;

    expect(shiftedMatch?.matchId).toBe(match?.matchId);
    expect(shiftedMatch?.location.path).not.toEqual(match?.location.path);
  });

  test("resolves page references and reports actual folder routes", () => {
    const props = new Map<string, Prop>(state.props);
    props.set("page-reference", {
      id: "page-reference",
      instanceId: "heading",
      name: "href",
      type: "page",
      value: "post",
    });

    expect(
      searchProject(
        { ...state, props },
        {
          query: "post",
          namespaces: ["props"],
        }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: {
            namespace: "props",
            path: ["page-reference", "value"],
          },
          reference: {
            namespace: "pages",
            entityType: "page",
            id: "post",
            resolved: true,
          },
        }),
      ])
    );
    expect(
      searchProject(state, { query: "Blog", namespaces: ["pages"] })
    ).toMatchObject({
      matches: expect.arrayContaining([
        expect.objectContaining({
          pageIds: ["post"],
          pagePaths: ["/blog/post"],
        }),
      ]),
    });
    expect(
      searchProject(state, {
        query: "Blog",
        namespaces: ["pages"],
        pagePath: "/",
      })
    ).toMatchObject({ total: 0 });
  });

  test("uses canonical asset usage for affected pages", () => {
    expect(
      searchProject(
        {
          ...state,
          projectSettings: {
            ...state.projectSettings,
            meta: { faviconAssetId: "next" },
          },
        },
        { query: "next.png", namespaces: ["assets"] }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: { type: "asset", id: "next" },
          pageIds: ["home", "post"],
          pagePaths: ["/", "/blog/post"],
        }),
      ])
    );
  });

  test("maps global data sources to every page", () => {
    const dataSources = new Map<string, DataSource>(
      [...state.dataSources].map(([id, dataSource]) => [
        id,
        dataSource as DataSource,
      ])
    );
    dataSources.set("global-variable", {
      id: "global-variable",
      type: "variable",
      name: "Global marker",
      scopeInstanceId: ROOT_INSTANCE_ID,
      value: { type: "string", value: "global-marker" },
    });

    expect(
      searchProject(
        { ...state, dataSources },
        {
          query: "global-marker",
          namespaces: ["dataSources"],
          pagePath: "/blog/post",
        }
      )
    ).toMatchObject({ total: 1, matches: [{ pageIds: ["home", "post"] }] });
    expect(
      searchProject(
        { ...state, dataSources },
        { query: ROOT_INSTANCE_ID, namespaces: ["dataSources"] }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reference: {
            namespace: "instances",
            entityType: "root",
            id: ROOT_INSTANCE_ID,
            resolved: true,
          },
        }),
      ])
    );
  });

  test("keeps same-name array match ids unique and redacts credential headers", () => {
    const resource = state.resources.get("resource");
    if (resource === undefined) {
      throw new Error("Resource fixture is missing");
    }
    const resources = new Map<string, Resource>([
      [
        resource.id,
        {
          ...resource,
          body: '"searchable-body"',
          headers: [
            { name: "X-Duplicate", value: '"first"' },
            { name: "X-Duplicate", value: '"second"' },
            { name: "X-API-Key", value: '"secret-header"' },
            { name: "X-Secret-Key", value: '"second-secret-header"' },
          ],
        },
      ],
    ]);
    const duplicateMatches = searchProject(
      { ...state, resources },
      { query: "X-Duplicate", namespaces: ["resources"] }
    ).matches as Array<{ matchId: string }>;

    expect(new Set(duplicateMatches.map(({ matchId }) => matchId)).size).toBe(
      duplicateMatches.length
    );
    expect(
      searchProject(
        { ...state, resources },
        { query: "secret-header", namespaces: ["resources"] }
      )
    ).toMatchObject({ total: 0, excludedSensitiveValueCount: 2 });
    expect(
      searchProject(
        { ...state, resources },
        { query: "second-secret-header", namespaces: ["resources"] }
      )
    ).toMatchObject({ total: 0, excludedSensitiveValueCount: 2 });
    expect(
      searchProject(
        { ...state, resources },
        { query: "searchable-body", namespaces: ["resources"] }
      )
    ).toMatchObject({ total: 1 });
  });

  test("resolves only actual instance and style-source references", () => {
    expect(
      searchProject(state, {
        query: "Hello",
        namespaces: ["instances"],
      }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reference: undefined }),
      ])
    );
    expect(
      searchProject(state, {
        query: "token",
        namespaces: ["styleSourceSelections"],
      }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: {
            namespace: "styleSourceSelections",
            path: ["heading", "values", 0],
          },
          reference: {
            namespace: "styleSources",
            entityType: "styleSource",
            id: "token",
            resolved: true,
          },
        }),
      ])
    );
  });

  test("rejects malformed generic matches at the output boundary", () => {
    expect(() =>
      runtimeOutputSchemas["project.search"].parse({
        query: "value",
        namespaces: ["props"],
        scopes: [],
        excludedSensitiveValueCount: 0,
        truncated: false,
        matches: [{ kind: "value" }],
        detail: "compact",
        total: 1,
        returnedCount: 1,
        nextCursor: null,
        filters: {},
      })
    ).toThrow();
  });
});
