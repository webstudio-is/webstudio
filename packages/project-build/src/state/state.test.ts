import { describe, expect, test } from "vitest";
import {
  applyBuilderPatchTransactions,
  builderNamespaces,
  createBuilderStateFreshness,
  createBuilderStateFromSerializedSnapshot,
  createBuilderStateFromSnapshot,
  createBuilderStateFromStores,
  getBuilderStateNamespacesByStatus,
  getLoadedBuilderStateNamespaces,
  getMissingBuilderStateNamespaces,
  getBuilderStateNamespaceFreshness,
  hasBuilderStateNamespaces,
  markBuilderStateNamespacesInvalidated,
  markBuilderStateNamespacesStale,
  type BuilderState,
  type BuilderStateSnapshot,
} from "./index";

const pages = {
  homePageId: "page-home",
  rootFolderId: "folder-root",
  pages: new Map([
    [
      "page-home",
      {
        id: "page-home",
        name: "Home",
        title: "Home",
        path: "",
        rootInstanceId: "instance-root",
        meta: {},
      },
    ],
  ]),
  folders: new Map([
    [
      "folder-root",
      {
        id: "folder-root",
        name: "Root",
        slug: "",
        children: ["page-home"],
      },
    ],
  ]),
};

const build = {
  pages,
  instances: [
    [
      "instance-root",
      {
        type: "instance",
        id: "instance-root",
        component: "Body",
        children: [],
      },
    ],
  ],
  props: [
    [
      "prop-title",
      {
        id: "prop-title",
        instanceId: "instance-root",
        name: "Title",
        type: "string",
        value: "Title",
      },
    ],
  ],
  styles: [],
  styleSources: [],
  styleSourceSelections: [],
  dataSources: [],
  resources: [],
  assets: [],
  breakpoints: [],
  marketplaceProduct: {
    category: "sectionTemplates",
    name: "Example section",
    thumbnailAssetId: "asset-thumbnail",
    author: "Webstudio",
    email: "hello@example.com",
    website: "",
    issues: "",
    description: "Example marketplace product",
  },
} as const satisfies BuilderStateSnapshot;

describe("builder state", () => {
  test("uses a shared namespace catalog", () => {
    expect(builderNamespaces).toEqual([
      "pages",
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
      "dataSources",
      "resources",
      "assets",
      "breakpoints",
      "marketplaceProduct",
    ]);
  });

  test("adapts snapshots without sharing mutable maps", () => {
    const state = createBuilderStateFromSnapshot(build);

    expect(state.pages?.homePageId).toBe(pages.homePageId);
    expect(state.pages?.rootFolderId).toBe(pages.rootFolderId);
    expect(state.pages?.pages).toEqual(pages.pages);
    expect(state.pages?.folders).toEqual(pages.folders);
    expect(state.pages).not.toBe(pages);
    expect(state.pages?.pages).not.toBe(pages.pages);
    expect(state.pages?.folders).not.toBe(pages.folders);
    expect(state.instances).toEqual(new Map(build.instances));
    expect(state.instances).not.toBe(build.instances);
    expect(state.instances?.get("instance-root")).not.toBe(
      build.instances[0]?.[1]
    );
    expect(getLoadedBuilderStateNamespaces(state)).toContain("pages");
    expect(hasBuilderStateNamespaces(state, ["pages", "instances"])).toBe(true);
  });

  test("adapts store boundaries without importing builder stores", () => {
    const state = createBuilderStateFromStores({
      pages: { get: () => pages },
      instances: { get: () => new Map(build.instances) },
      props: { get: () => undefined },
    });

    expect(state.pages?.pages).toEqual(pages.pages);
    expect(state.pages).not.toBe(pages);
    expect(state.pages?.pages).not.toBe(pages.pages);
    expect(state.instances).toEqual(new Map(build.instances));
    expect(state.instances?.get("instance-root")).not.toBe(
      build.instances[0]?.[1]
    );
    expect(state.props).toBeUndefined();
  });

  test("adapts serialized snapshots with migrated pages", () => {
    const state = createBuilderStateFromSerializedSnapshot({
      pages: {
        ...pages,
        pages: Array.from(pages.pages.values()),
        folders: Array.from(pages.folders.values()),
      },
      props: build.props,
    });

    expect(state.pages?.pages).toEqual(pages.pages);
    expect(state.pages?.folders).toEqual(pages.folders);
    expect(state.props).toEqual(new Map(build.props));
  });

  test("reports missing, fresh, stale, and invalidated namespaces", () => {
    const state: BuilderState = { pages, instances: new Map(build.instances) };
    const freshness = createBuilderStateFreshness({
      state,
      version: 3,
      staleNamespaces: ["instances"],
    });

    expect(getMissingBuilderStateNamespaces(state, ["pages", "props"])).toEqual(
      ["props"]
    );
    expect(getBuilderStateNamespacesByStatus(freshness, "fresh")).toEqual([
      "pages",
    ]);
    expect(getBuilderStateNamespacesByStatus(freshness, "stale")).toEqual([
      "instances",
    ]);
    expect(getBuilderStateNamespacesByStatus(freshness, "missing")).toContain(
      "props"
    );

    const stale = markBuilderStateNamespacesStale(freshness, ["pages"]);
    expect(getBuilderStateNamespacesByStatus(stale, "stale")).toEqual([
      "pages",
      "instances",
    ]);
    expect(markBuilderStateNamespacesStale(stale, ["props"]).props).toEqual({
      status: "missing",
    });

    const invalidated = markBuilderStateNamespacesInvalidated(
      stale,
      ["pages"],
      "tx-1"
    );
    expect(invalidated.pages).toEqual({
      status: "invalidated",
      version: 3,
      invalidatedBy: "tx-1",
    });
    expect(
      markBuilderStateNamespacesInvalidated(invalidated, ["props"], "tx-1")
        .props
    ).toEqual({ status: "missing" });

    expect(
      markBuilderStateNamespacesStale(invalidated, ["pages"]).pages
    ).toEqual({
      status: "stale",
      version: 3,
    });
    expect(
      markBuilderStateNamespacesInvalidated(stale, ["pages"]).pages
    ).toEqual({
      status: "invalidated",
      version: 3,
    });
  });

  test("does not share mutable missing freshness objects", () => {
    const first = getBuilderStateNamespaceFreshness({}, "pages");
    first.status = "fresh";

    expect(getBuilderStateNamespaceFreshness({}, "pages")).toEqual({
      status: "missing",
    });

    const freshness = createBuilderStateFreshness({ state: {} });
    expect(freshness.pages).not.toBe(freshness.instances);
  });
});

describe("builder state patches", () => {
  test("applies transactions without mutating the input state object", () => {
    const state: BuilderState = {
      props: new Map(build.props),
    };
    const { state: nextState, changedNamespaces } =
      applyBuilderPatchTransactions(state, [
        {
          id: "tx-1",
          payload: [
            {
              namespace: "props",
              patches: [
                {
                  op: "add",
                  path: ["prop-subtitle"],
                  value: {
                    id: "prop-subtitle",
                    instanceId: "instance-root",
                    name: "Subtitle",
                    type: "string",
                    value: "Subtitle",
                  },
                },
              ],
            },
          ],
        },
      ]);

    expect(changedNamespaces).toEqual(["props"]);
    expect(nextState).not.toBe(state);
    expect(nextState.props).not.toBe(state.props);
    expect(state.props?.has("prop-subtitle")).toBe(false);
    expect(nextState.props?.get("prop-subtitle")).toEqual({
      id: "prop-subtitle",
      instanceId: "instance-root",
      name: "Subtitle",
      type: "string",
      value: "Subtitle",
    });
  });

  test("ignores empty patch changes", () => {
    const { state: nextState, changedNamespaces } =
      applyBuilderPatchTransactions({}, [
        {
          id: "tx-1",
          payload: [{ namespace: "props", patches: [] }],
        },
      ]);

    expect(nextState).toEqual({});
    expect(changedNamespaces).toEqual([]);
  });

  test("fails when a transaction targets a missing namespace", () => {
    expect(() =>
      applyBuilderPatchTransactions({}, [
        {
          id: "tx-1",
          payload: [
            {
              namespace: "props",
              patches: [
                {
                  op: "remove",
                  path: ["prop-title"],
                },
              ],
            },
          ],
        },
      ])
    ).toThrow('Builder state namespace "props" is missing.');
  });
});
