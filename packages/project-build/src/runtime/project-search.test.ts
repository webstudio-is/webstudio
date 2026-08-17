import { describe, expect, test } from "vitest";
import { builderNamespaces } from "../contracts/namespaces";
import { searchProject } from "./project-search";
import { expectRuntimeValidationError, state } from "./runtime.test-fixtures";

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
        matchId: 'project-match:v1:["projectSettings","meta","siteName"]',
        currentValue: "Needle project",
        location: {
          namespace: "projectSettings",
          path: ["meta", "siteName"],
        },
      }),
      expect.objectContaining({
        matchId: 'project-match:v1:["marketplaceProduct","name"]',
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
      total: 2,
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
});
