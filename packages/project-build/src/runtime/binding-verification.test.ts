import { describe, expect, test } from "vitest";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { executeBuilderRuntimeOperation } from "./registry";
import { verifyBindings } from "./binding-verification";
import { context, expectRuntimeValidationError } from "./runtime.test-fixtures";

const createState = (): BuilderState => {
  const global = encodeDataVariableId("global-title");
  const item = encodeDataVariableId("collection-item");
  return {
    pages: {
      homePageId: "home",
      rootFolderId: "root",
      meta: {},
      compiler: {},
      pages: new Map([
        [
          "home",
          {
            id: "home",
            name: "Home",
            title: global,
            path: "",
            rootInstanceId: "body",
            meta: { description: `${global} ?? "Catalog"` },
          },
        ],
        [
          "other",
          {
            id: "other",
            name: "Other",
            title: '"Other"',
            path: "/other",
            rootInstanceId: "other-body",
            meta: {},
          },
        ],
      ]),
      folders: new Map([
        [
          "root",
          {
            id: "root",
            name: "Root",
            slug: "",
            children: ["home", "other"],
          },
        ],
      ]),
    },
    instances: new Map([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "collection" },
            { type: "id", value: "sibling" },
          ],
        },
      ],
      [
        "collection",
        {
          type: "instance",
          id: "collection",
          component: "Collection",
          children: [{ type: "id", value: "item" }],
        },
      ],
      [
        "item",
        {
          type: "instance",
          id: "item",
          component: "Text",
          children: [{ type: "expression", value: `${item}.name` }],
        },
      ],
      [
        "sibling",
        {
          type: "instance",
          id: "sibling",
          component: "Text",
          children: [],
        },
      ],
      [
        "other-body",
        {
          type: "instance",
          id: "other-body",
          component: "Body",
          children: [],
        },
      ],
    ]),
    props: new Map([
      [
        "item-expression",
        {
          id: "item-expression",
          instanceId: "item",
          name: "title",
          type: "expression",
          value: `${item}.name`,
        },
      ],
      [
        "item-action",
        {
          id: "item-action",
          instanceId: "item",
          name: "onClick",
          type: "action",
          value: [{ type: "execute", args: ["event"], code: "event" }],
        },
      ],
      [
        "item-parameter",
        {
          id: "item-parameter",
          instanceId: "item",
          name: "item",
          type: "parameter",
          value: "collection-item",
        },
      ],
      [
        "item-resource",
        {
          id: "item-resource",
          instanceId: "item",
          name: "action",
          type: "resource",
          value: "posts-resource",
        },
      ],
    ]),
    dataSources: new Map([
      [
        "global-title",
        {
          id: "global-title",
          type: "variable",
          name: "globalTitle",
          scopeInstanceId: "body",
          value: { type: "string", value: "Catalog" },
        },
      ],
      [
        "collection-item",
        {
          id: "collection-item",
          type: "parameter",
          name: "collectionItem",
          scopeInstanceId: "collection",
        },
      ],
      [
        "collection-key",
        {
          id: "collection-key",
          type: "parameter",
          name: "collectionItemKey",
          scopeInstanceId: "collection",
        },
      ],
      [
        "posts",
        {
          id: "posts",
          type: "resource",
          name: "posts",
          scopeInstanceId: "body",
          resourceId: "posts-resource",
        },
      ],
    ]),
    resources: new Map([
      [
        "posts-resource",
        {
          id: "posts-resource",
          name: "Posts",
          method: "get",
          url: `"/posts?title=" + ${global}`,
          headers: [{ name: "x-path", value: "$ws$system.pathname" }],
          searchParams: [],
        },
      ],
    ]),
  };
};

describe("project.verifyBindings", () => {
  test("accepts Collection locals, action args, resources, and page metadata", () => {
    const result = verifyBindings(createState(), {});

    expect(result.analysis).toEqual({
      staticIntegrity: "complete",
      renderedResolution: "not-evaluated",
      externalResourcesExecuted: false,
    });
    expect(result.summary.bindingsChecked).toBeGreaterThan(8);
    expect(result.findings).toEqual([]);
  });

  test("reports missing references, scope violations, unknown names, and stale ids", () => {
    const state = createState();
    const stale = encodeDataVariableId("deleted-variable");
    const item = encodeDataVariableId("collection-item");
    state.instances?.get("item")?.children.push({
      type: "expression",
      value: "misspelled.name",
    });
    state.props?.set("stale-expression", {
      id: "stale-expression",
      instanceId: "item",
      name: "stale",
      type: "expression",
      value: stale,
    });
    state.props?.set("invalid-expression", {
      id: "invalid-expression",
      instanceId: "item",
      name: "invalid",
      type: "expression",
      value: "item +",
    });
    state.props?.set("out-of-scope-expression", {
      id: "out-of-scope-expression",
      instanceId: "sibling",
      name: "itemName",
      type: "expression",
      value: `${item}.name`,
    });
    state.props?.set("missing-parameter", {
      id: "missing-parameter",
      instanceId: "item",
      name: "missingItem",
      type: "parameter",
      value: "deleted-parameter",
    });
    state.props?.set("out-of-scope-parameter", {
      id: "out-of-scope-parameter",
      instanceId: "sibling",
      name: "item",
      type: "parameter",
      value: "collection-item",
    });
    state.props?.set("missing-resource", {
      id: "missing-resource",
      instanceId: "item",
      name: "action2",
      type: "resource",
      value: "deleted-resource",
    });

    const result = verifyBindings(state, { limit: 200 });
    const codes = result.findings.map(({ code }) => code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "invalid-expression",
        "unknown-identifier",
        "stale-data-source-id",
        "out-of-scope-data-source",
        "missing-parameter",
        "out-of-scope-parameter",
        "missing-resource",
      ])
    );
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-resource",
          remediation: expect.stringContaining("existing resource"),
        }),
      ])
    );
  });

  test("identifies missing resources owned by data sources", () => {
    const state = createState();
    const posts = state.dataSources!.get("posts");
    if (posts?.type !== "resource") {
      throw new Error("Expected resource data source fixture");
    }
    posts.resourceId = "deleted-resource";

    const result = verifyBindings(state, { limit: 200 });

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "missing-resource",
        bindingKind: "data-source-resource",
        location: expect.objectContaining({
          dataSourceId: "posts",
          resourceId: "deleted-resource",
          path: ["dataSources", "posts", "resourceId"],
        }),
      })
    );
  });

  test("accepts a parameter prop on the Collection that owns it", () => {
    const state = createState();
    state.props?.set("collection-item-prop", {
      id: "collection-item-prop",
      instanceId: "collection",
      name: "item",
      type: "parameter",
      value: "collection-item",
    });

    const result = verifyBindings(state, { limit: 200 });

    expect(result.findings).not.toContainEqual(
      expect.objectContaining({
        bindingKind: "prop-parameter",
        location: expect.objectContaining({ propId: "collection-item-prop" }),
      })
    );
  });

  test("filters by page and instance subtree and paginates stable findings", () => {
    const state = createState();
    state.pages!.pages.get("other")!.title = "unknownOther";
    state.instances
      ?.get("item")
      ?.children.push(
        { type: "expression", value: "unknownOne" },
        { type: "expression", value: "unknownTwo" }
      );

    const first = verifyBindings(state, {
      pagePath: "/",
      instanceId: "item",
      limit: 1,
    });
    const second = verifyBindings(state, {
      pagePath: "/",
      instanceId: "item",
      limit: 1,
      cursor: first.nextCursor ?? undefined,
    });

    expect(first.total).toBe(2);
    expect(first.returnedCount).toBe(1);
    expect(first.nextCursor).toBe("1");
    expect(second.findings[0]?.id).not.toBe(first.findings[0]?.id);
    expect([...first.findings, ...second.findings]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: expect.objectContaining({ pageId: "other" }),
        }),
      ])
    );
  });

  test("reports the full path for a page nested in a folder", () => {
    const state = createState();
    state.pages!.folders.get("root")!.children = ["home", "section"];
    state.pages!.folders.set("section", {
      id: "section",
      name: "Section",
      slug: "section",
      children: ["other"],
    });
    state.pages!.pages.get("other")!.title =
      encodeDataVariableId("global-title");

    const result = verifyBindings(state, { pageId: "other" });

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "out-of-scope-data-source",
        location: expect.objectContaining({
          pageId: "other",
          pagePath: "/section/other",
        }),
      })
    );
  });

  test("is exposed through the canonical runtime operation", () => {
    const result = executeBuilderRuntimeOperation({
      id: "project.verifyBindings",
      state: createState(),
      input: { pageId: "home" },
      context,
    });

    expect(result).toMatchObject({ contractVersion: 1, findings: [] });
    expectRuntimeValidationError("project.verifyBindings", {
      pageId: "home",
      pagePath: "/",
    });
  });
});
