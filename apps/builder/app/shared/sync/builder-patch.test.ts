import { describe, expect, test } from "vitest";
import type { Instance, WebstudioData } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts/patch";
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

const createData = (): WebstudioData => ({
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
});

const setupStores = (data: WebstudioData) => {
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
  serverSyncStore.popAll();
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
        op: "replace",
        path: ["existing", "children", 0, "value"],
        value: "new",
      },
      {
        op: "add",
        path: ["added"],
        value: createInstance("added", [{ type: "id", value: "child" }]),
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
      op: "replace",
      path: ["existing", "children", 0, "value"],
      value: "new",
    });
    expect(change.patches[1]).toEqual({
      op: "add",
      path: ["added"],
      value: createInstance("added", [{ type: "id", value: "child" }]),
    });
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
});
