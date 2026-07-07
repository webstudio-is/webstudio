import { enableMapSet } from "immer";
import { describe, expect, test } from "vitest";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $selectedBreakpointId,
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
import { deleteProperty, setProperty } from "./use-style-data";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";

enableMapSet();
registerContainers();

const setupBaseStores = () => {
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
});
