import { enableMapSet } from "immer";
import { describe, expect, test } from "vitest";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import {
  $selectedBreakpointId,
  $selectedStyleState,
  $selectedStyleSources,
} from "~/shared/nano-states";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $breakpoints, $pages } from "~/shared/sync/data-stores";
import {
  $assets,
  $dataSources,
  $instances,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";
import {
  createBatchUpdate,
  deleteProperty,
  setProperty,
} from "./use-style-data";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";

enableMapSet();
registerContainers();

const setupBaseStores = () => {
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  const pages = createDefaultPages({ rootInstanceId: "body" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $instances.set(
    new Map([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ])
  );
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $assets.set(new Map());
  selectInstance(["body"]);
  $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
  $selectedBreakpointId.set("base");
  $selectedStyleState.set(undefined);
  $styles.set(new Map());
};

const setupSelection = (styleSource: {
  id: string;
  type: "token";
  name: string;
  locked?: true;
}) => {
  setupBaseStores();
  $styleSources.set(new Map([[styleSource.id, styleSource]]));
  $styleSourceSelections.set(
    new Map([
      [
        "body",
        {
          instanceId: "body",
          values: [styleSource.id],
        },
      ],
    ])
  );
  $selectedStyleSources.set(new Map([["body", styleSource.id]]));
};

const invalidState = "::-webkit-search-cancel-button";
const createInvalidStyleDecl = (styleSourceId: string): StyleDecl => ({
  breakpointId: "base",
  styleSourceId,
  property: "color",
  state: invalidState,
  value: { type: "keyword", value: "red" },
});

describe("use-style-data", () => {
  test("does not write styles for locked tokens", () => {
    setupSelection({
      id: "token1",
      type: "token",
      name: "Primary",
      locked: true,
    });

    setProperty("color")({ type: "keyword", value: "red" });

    expect($styles.get().size).toBe(0);
  });

  test("does not delete styles for locked tokens", () => {
    setupSelection({
      id: "token1",
      type: "token",
      name: "Primary",
      locked: true,
    });

    const styleDecl: StyleDecl = {
      breakpointId: "base",
      styleSourceId: "token1",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    $styles.set(new Map([[getStyleDeclKey(styleDecl), styleDecl]]));

    deleteProperty("color");

    expect(Array.from($styles.get().values())).toEqual([styleDecl]);
  });

  test("writes styles for unlocked tokens", () => {
    setupSelection({
      id: "token1",
      type: "token",
      name: "Primary",
    });

    setProperty("color")({ type: "keyword", value: "red" });

    expect(Array.from($styles.get().values())).toEqual([
      {
        breakpointId: "base",
        styleSourceId: "token1",
        property: "color",
        value: { type: "keyword", value: "red" },
        listed: undefined,
        state: undefined,
      },
    ]);
  });

  test("deletes an existing token declaration with an invalid state", () => {
    setupSelection({ id: "token1", type: "token", name: "Primary" });
    const styleDecl = createInvalidStyleDecl("token1");
    $styles.set(new Map([[getStyleDeclKey(styleDecl), styleDecl]]));
    $selectedStyleState.set(invalidState);

    deleteProperty("color");

    expect($styles.get().size).toBe(0);
  });

  test("deletes an existing local declaration with an invalid state", () => {
    setupBaseStores();
    const styleDecl = createInvalidStyleDecl("local1");
    $styleSources.set(
      new Map([["local1", { id: "local1", type: "local" as const }]])
    );
    $styleSourceSelections.set(
      new Map([["body", { instanceId: "body", values: ["local1"] }]])
    );
    $selectedStyleSources.set(new Map());
    $styles.set(new Map([[getStyleDeclKey(styleDecl), styleDecl]]));
    $selectedStyleState.set(invalidState);

    deleteProperty("color");

    expect($styles.get().size).toBe(0);
  });

  test("writes styles for implicit local source through runtime generated ids", () => {
    setupBaseStores();
    $styleSources.set(new Map());
    $styleSourceSelections.set(new Map());
    $selectedStyleSources.set(new Map());

    setProperty("color")({ type: "keyword", value: "red" });

    const styleSources = Array.from($styleSources.get().values());
    expect(styleSources).toEqual([
      expect.objectContaining({
        type: "local",
        id: expect.any(String),
      }),
    ]);
    const localStyleSourceId = styleSources[0]?.id;
    expect($styleSourceSelections.get().get("body")).toEqual({
      instanceId: "body",
      values: [localStyleSourceId],
    });
    expect(Array.from($styles.get().values())).toEqual([
      {
        breakpointId: "base",
        styleSourceId: localStyleSourceId,
        property: "color",
        value: { type: "keyword", value: "red" },
        listed: undefined,
        state: undefined,
      },
    ]);
  });

  test("commits mixed batch updates in one undoable transaction", () => {
    setupSelection({ id: "token1", type: "token", name: "Primary" });
    const color: StyleDecl = {
      breakpointId: "base",
      styleSourceId: "token1",
      property: "color",
      value: { type: "keyword", value: "red" },
    };
    $styles.set(new Map([[getStyleDeclKey(color), color]]));

    const batch = createBatchUpdate();
    batch.deleteProperty("color");
    batch.setProperty("display")({ type: "keyword", value: "grid" });
    batch.publish();

    expect(Array.from($styles.get().values())).toEqual([
      expect.objectContaining({
        property: "display",
        value: { type: "keyword", value: "grid" },
      }),
    ]);
    serverSyncStore.undo();
    expect(Array.from($styles.get().values())).toEqual([color]);
  });
});
