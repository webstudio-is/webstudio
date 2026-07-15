import { describe, expect, test } from "vitest";
import type { Instance, WebstudioData } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { ProjectSettings } from "@webstudio-is/project-build";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import {
  createSyncChangesFromBuilderPatchPayload,
  createTransactionFromBuilderPatchPayload,
} from "./builder-patch";
import { registerContainers, serverSyncStore } from "./sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $projectSettings,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "./data-stores";

registerContainers();

const createInstance = (
  id: Instance["id"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: "ws:element",
  tag: "div",
  children,
});

type TestData = WebstudioData & { projectSettings: ProjectSettings };

const createData = (): TestData => ({
  pages: createDefaultPages({ rootInstanceId: "body" }),
  instances: new Map([
    ["body", createInstance("body")],
    ["existing", createInstance("existing", [{ type: "id", value: "old" }])],
    ["removed", createInstance("removed")],
  ]),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  breakpoints: new Map(),
  styleSourceSelections: new Map(),
  styleSources: new Map(),
  styles: new Map(),
  assets: new Map(),
  projectSettings: { meta: {}, compiler: {} },
});

const setupStores = (data: TestData) => {
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  $pages.set(data.pages);
  $instances.set(data.instances);
  $props.set(data.props);
  $dataSources.set(data.dataSources);
  $resources.set(data.resources);
  $breakpoints.set(data.breakpoints);
  $styleSourceSelections.set(data.styleSourceSelections);
  $styleSources.set(data.styleSources);
  $styles.set(data.styles);
  $assets.set(data.assets);
  $projectSettings.set(data.projectSettings);
};

describe("builder patch sync adapter", () => {
  test("converts builder patches into sync changes with reverse patches", () => {
    const data = createData();
    const added = createInstance("added");
    const payload: BuilderPatchChange[] = [
      { namespace: "props", patches: [] },
      {
        namespace: "instances",
        patches: [
          { op: "add", path: ["added"], value: added },
          {
            op: "add",
            path: ["added", "children", 0],
            value: { type: "id", value: "child" },
          },
          {
            op: "replace",
            path: ["existing", "children", 0, "value"],
            value: "new",
          },
          { op: "remove", path: ["removed"] },
        ],
      },
    ];

    const changes = createSyncChangesFromBuilderPatchPayload({
      data,
      payload,
    });

    expect(changes).toHaveLength(1);
    const [change] = changes;
    expect(change.namespace).toEqual("instances");
    expect(change.patches).toEqual([
      {
        op: "add",
        path: ["added"],
        value: createInstance("added"),
      },
      {
        op: "add",
        path: ["added", "children", 0],
        value: { type: "id", value: "child" },
      },
      {
        op: "replace",
        path: ["existing", "children", 0, "value"],
        value: "new",
      },
      { op: "remove", path: ["removed"] },
    ]);
    expect(change.revisePatches).toEqual(
      expect.arrayContaining([
        { op: "remove", path: ["added"] },
        {
          op: "replace",
          path: ["existing", "children", 0, "value"],
          value: "old",
        },
        { op: "add", path: ["removed"], value: createInstance("removed") },
      ])
    );

    added.children.push({ type: "id", value: "mutated-after-conversion" });
    expect(change.patches[0]).toEqual({
      op: "add",
      path: ["added"],
      value: createInstance("added"),
    });
  });

  test("compacts reverse patches for undo", () => {
    const data = createData();
    const added = createInstance("added");
    const payload: BuilderPatchChange[] = [
      {
        namespace: "instances",
        patches: [
          { op: "add", path: ["added"], value: added },
          {
            op: "add",
            path: ["added", "children", 0],
            value: { type: "id", value: "child" },
          },
        ],
      },
    ];

    const changes = createSyncChangesFromBuilderPatchPayload({
      data,
      payload,
    });

    expect(changes).toHaveLength(1);
    const [change] = changes;
    expect(change.revisePatches).toEqual([
      {
        op: "remove",
        path: ["added"],
      },
    ]);
    expect(change.patches).toEqual([
      {
        op: "add",
        path: ["added"],
        value: createInstance("added"),
      },
      {
        op: "add",
        path: ["added", "children", 0],
        value: { type: "id", value: "child" },
      },
    ]);
  });

  test("preserves runtime add patches for undefined object fields", () => {
    const data = createData();
    const page = data.pages.pages.get(data.pages.homePageId);
    if (page === undefined) {
      throw Error("Expected fixture page");
    }
    page.marketplace = {
      include: true,
      category: undefined,
      thumbnailAssetId: undefined,
    };

    const changes = createSyncChangesFromBuilderPatchPayload({
      data,
      payload: [
        {
          namespace: "pages",
          patches: [
            {
              op: "add",
              path: ["pages", data.pages.homePageId, "marketplace", "category"],
              value: "Runtime Examples",
            },
          ],
        },
      ],
    });

    expect(changes).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "add",
            path: ["pages", data.pages.homePageId, "marketplace", "category"],
            value: "Runtime Examples",
          },
        ],
        revisePatches: [
          {
            op: "replace",
            path: ["pages", data.pages.homePageId, "marketplace", "category"],
            value: undefined,
          },
        ],
      },
    ]);
  });

  test("commits builder patch payloads through sync undo and redo", () => {
    const data = createData();
    setupStores(data);

    createTransactionFromBuilderPatchPayload({
      data,
      payload: [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: ["existing", "children", 0, "value"],
              value: "new",
            },
          ],
        },
      ],
    });

    expect($instances.get().get("existing")?.children).toEqual([
      { type: "id", value: "new" },
    ]);

    serverSyncStore.undo();
    expect($instances.get().get("existing")?.children).toEqual([
      { type: "id", value: "old" },
    ]);

    serverSyncStore.redo();
    expect($instances.get().get("existing")?.children).toEqual([
      { type: "id", value: "new" },
    ]);
  });

  test("commits project settings through sync undo and redo", () => {
    const data = createData();
    data.projectSettings.meta.siteName = "Before";
    setupStores(data);

    createTransactionFromBuilderPatchPayload({
      data,
      payload: [
        {
          namespace: "projectSettings",
          patches: [
            {
              op: "replace",
              path: ["meta", "siteName"],
              value: "After",
            },
          ],
        },
      ],
    });

    expect($projectSettings.get()?.meta.siteName).toBe("After");

    serverSyncStore.undo();
    expect($projectSettings.get()?.meta.siteName).toBe("Before");

    serverSyncStore.redo();
    expect($projectSettings.get()?.meta.siteName).toBe("After");
  });

  test("commits style source selection removals through sync undo and redo", () => {
    const data = createData();
    data.styleSourceSelections.set("card", {
      instanceId: "card",
      values: ["local"],
    });
    setupStores(data);

    createTransactionFromBuilderPatchPayload({
      data,
      payload: [
        {
          namespace: "styleSourceSelections",
          patches: [{ op: "remove", path: ["card"] }],
        },
      ],
    });

    expect($styleSourceSelections.get()).toEqual(new Map());

    serverSyncStore.undo();
    expect($styleSourceSelections.get()).toEqual(
      new Map([["card", { instanceId: "card", values: ["local"] }]])
    );

    serverSyncStore.redo();
    expect($styleSourceSelections.get()).toEqual(new Map());
  });
});
