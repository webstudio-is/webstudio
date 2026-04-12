import { enableMapSet } from "immer";
import { describe, expect, test } from "vitest";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $breakpoints,
  $instances,
  $selectedBreakpointId,
  $selectedStyleSources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/nano-states";
import { $awareness } from "~/shared/awareness";
import { deleteProperty, setProperty } from "./use-style-data";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";

enableMapSet();
registerContainers();

const setupSelection = (styleSource: {
  id: string;
  type: "token";
  name: string;
  locked?: true;
}) => {
  $instances.set(
    new Map([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ])
  );
  $awareness.set({
    pageId: "",
    instanceSelector: ["body"],
  });
  $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
  $selectedBreakpointId.set("base");
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
  $styles.set(new Map());
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
});
