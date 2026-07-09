import { enableMapSet } from "immer";
import { beforeEach, describe, expect, test } from "vitest";
import type {
  DataSource,
  Prop,
  Resource,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { coreMetas } from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import { $, renderData } from "@webstudio-is/template";
import {
  $registeredComponentMetas,
  $registeredTemplates,
  $selectedInstanceSelector,
  selectPage,
  type ItemDropTarget,
} from "~/shared/nano-states";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import { commitCanvasDragDrop } from "./use-drag-drop";

enableMapSet();
registerContainers();

const defaultMetasMap = new Map(
  Object.entries({ ...defaultMetas, ...coreMetas })
);

const resetStores = () => {
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  $project.set({ id: "projectId" } as Project);
  $pages.set(
    createDefaultPages({ homePageId: "homePageId", rootInstanceId: "body" })
  );
  selectPage("homePageId");
  $registeredComponentMetas.set(defaultMetasMap);
  $registeredTemplates.set(new Map());
  $breakpoints.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styles.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $props.set(new Map());
  $assets.set(new Map());
};

const createDropTarget = (
  itemSelector: ItemDropTarget["itemSelector"]
): ItemDropTarget => ({
  itemSelector,
  placement: {
    closestChildIndex: 0,
    indexAdjustment: 0,
    childrenOrientation: { type: "vertical", reverse: false },
  },
  indexWithinChildren: 0,
});

describe("commitCanvasDragDrop", () => {
  beforeEach(() => {
    resetStores();
  });

  test("reparents existing subtree through runtime bridge and preserves related data", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="source">
          <$.Text ws:id="child">Dynamic card</$.Text>
        </$.Box>
        <$.Box ws:id="target"></$.Box>
      </$.Body>
    );
    const prop = {
      id: "child-prop",
      instanceId: "child",
      name: "data-prop",
      type: "string",
      value: "kept",
    } satisfies Prop;
    const styleSource = {
      type: "local",
      id: "source-style-source",
    } satisfies StyleSource;
    const styleSourceSelection = {
      instanceId: "source",
      values: ["source-style-source"],
    } satisfies StyleSourceSelection;
    const styleDecl = {
      styleSourceId: "source-style-source",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    } satisfies StyleDecl;
    const dataSource = {
      id: "source-data-source",
      scopeInstanceId: "source",
      name: "card",
      type: "variable",
      value: { type: "string", value: "dynamic" },
    } satisfies DataSource;
    const resource = {
      id: "source-resource",
      name: "cardResource",
      url: "https://example.com/card.json",
      method: "get",
      headers: [],
      searchParams: [],
    } satisfies Resource;

    $instances.set(data.instances);
    $props.set(new Map([[prop.id, prop]]));
    $styleSources.set(new Map([[styleSource.id, styleSource]]));
    $styleSourceSelections.set(
      new Map([[styleSourceSelection.instanceId, styleSourceSelection]])
    );
    $styles.set(new Map([["source-style", styleDecl]]));
    $dataSources.set(new Map([[dataSource.id, dataSource]]));
    $resources.set(new Map([[resource.id, resource]]));
    serverSyncStore.popAll();

    expect(
      commitCanvasDragDrop({
        dragPayload: {
          origin: "canvas",
          type: "reparent",
          dragInstanceSelector: ["source", "body"],
        },
        dropTarget: createDropTarget(["target", "body"]),
      })
    ).toBe(true);

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "target" },
    ]);
    expect($instances.get().get("target")?.children).toEqual([
      { type: "id", value: "source" },
    ]);
    expect($instances.get().get("source")?.children).toEqual([
      { type: "id", value: "child" },
    ]);
    expect($props.get()).toEqual(new Map([[prop.id, prop]]));
    expect($styleSources.get()).toEqual(
      new Map([[styleSource.id, styleSource]])
    );
    expect($styleSourceSelections.get()).toEqual(
      new Map([[styleSourceSelection.instanceId, styleSourceSelection]])
    );
    expect($styles.get()).toEqual(new Map([["source-style", styleDecl]]));
    expect($dataSources.get()).toEqual(new Map([[dataSource.id, dataSource]]));
    expect($resources.get()).toEqual(new Map([[resource.id, resource]]));
    expect($selectedInstanceSelector.get()).toEqual([
      "source",
      "target",
      "body",
    ]);

    const changes = serverSyncStore.popAll().flatMap((item) => item.changes);
    expect(changes.map((change) => change.namespace).sort()).toEqual([
      "instances",
    ]);

    serverSyncStore.undo();
    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "source" },
      { type: "id", value: "target" },
    ]);
    expect($instances.get().get("target")?.children).toEqual([]);
    expect($props.get()).toEqual(new Map([[prop.id, prop]]));
    expect($styleSources.get()).toEqual(
      new Map([[styleSource.id, styleSource]])
    );
    expect($styleSourceSelections.get()).toEqual(
      new Map([[styleSourceSelection.instanceId, styleSourceSelection]])
    );
    expect($styles.get()).toEqual(new Map([["source-style", styleDecl]]));
    expect($dataSources.get()).toEqual(new Map([[dataSource.id, dataSource]]));
    expect($resources.get()).toEqual(new Map([[resource.id, resource]]));

    serverSyncStore.redo();
    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "target" },
    ]);
    expect($instances.get().get("target")?.children).toEqual([
      { type: "id", value: "source" },
    ]);
  });

  test("inserts dragged component through runtime bridge", () => {
    const data = renderData(<$.Body ws:id="body"></$.Body>);
    $instances.set(data.instances);
    serverSyncStore.popAll();

    expect(
      commitCanvasDragDrop({
        dragPayload: {
          origin: "panel",
          type: "insert",
          dragComponent: "Button",
        },
        dropTarget: createDropTarget(["body"]),
      })
    ).toBe(true);

    const buttonId = $instances.get().get("body")?.children[0]?.value;
    expect(buttonId).toEqual(expect.any(String));
    expect($instances.get().get(buttonId ?? "")).toMatchObject({
      component: "Button",
    });
    expect($selectedInstanceSelector.get()).toEqual([buttonId, "body"]);

    const changes = serverSyncStore.popAll().flatMap((item) => item.changes);
    expect(changes.map((change) => change.namespace).sort()).toEqual([
      "instances",
    ]);

    serverSyncStore.undo();
    expect($instances.get()).toEqual(data.instances);

    serverSyncStore.redo();
    expect($instances.get().get("body")?.children[0]?.value).toEqual(buttonId);
  });

  test("does not commit incomplete drag state", () => {
    const data = renderData(<$.Body ws:id="body"></$.Body>);
    $instances.set(data.instances);

    expect(
      commitCanvasDragDrop({
        dragPayload: undefined,
        dropTarget: createDropTarget(["body"]),
      })
    ).toBe(false);
    expect($instances.get()).toEqual(data.instances);
  });
});
