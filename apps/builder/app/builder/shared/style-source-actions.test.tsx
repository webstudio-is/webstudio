import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { getStyleDeclKey, type StyleDecl } from "@webstudio-is/sdk";
import {
  selectInstance,
  $selectedPageId,
  $selectedStyleSources,
  $selectedStyleState,
} from "~/shared/nano-states";
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
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  deleteStyleSource,
  deselectMatchingStyleSource,
  renameStyleSource,
  setStyleSourceLocked,
} from "./style-source-actions";

registerContainers();

const setupBaseStores = () => {
  const pages = createDefaultPages({ rootInstanceId: "instance" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $instances.set(
    new Map([
      [
        "instance",
        { type: "instance", id: "instance", component: "Box", children: [] },
      ],
    ])
  );
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $assets.set(new Map());
  $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
  selectInstance(["instance"]);
};

test("deselects matching style source for selected instance", () => {
  setupBaseStores();
  $selectedStyleSources.set(new Map([["instance", "style-source"]]));
  $selectedStyleState.set(":hover");

  deselectMatchingStyleSource("style-source");

  expect($selectedStyleSources.get().has("instance")).toBe(false);
  expect($selectedStyleState.get()).toBeUndefined();
});

test("keeps selection when selected style source does not match", () => {
  setupBaseStores();
  $selectedStyleSources.set(new Map([["instance", "style-source"]]));
  $selectedStyleState.set(":hover");

  deselectMatchingStyleSource("other-style-source");

  expect($selectedStyleSources.get().get("instance")).toBe("style-source");
  expect($selectedStyleState.get()).toBe(":hover");
});

test("updates style sources through runtime mutations", () => {
  setupBaseStores();
  const styleDecl: StyleDecl = {
    breakpointId: "base",
    styleSourceId: "token",
    property: "color",
    value: { type: "keyword", value: "red" },
  };
  $styleSources.set(
    new Map([["token", { type: "token", id: "token", name: "Primary" }]])
  );
  $styleSourceSelections.set(
    new Map([["instance", { instanceId: "instance", values: ["token"] }]])
  );
  $styles.set(new Map([[getStyleDeclKey(styleDecl), styleDecl]]));
  $selectedStyleSources.set(new Map([["instance", "token"]]));

  expect(renameStyleSource("token", "Brand")).toBeUndefined();
  expect($styleSources.get().get("token")).toEqual({
    type: "token",
    id: "token",
    name: "Brand",
  });

  setStyleSourceLocked("token", true);
  expect($styleSources.get().get("token")).toEqual({
    type: "token",
    id: "token",
    name: "Brand",
    locked: true,
  });

  deleteStyleSource("token");
  expect($styleSources.get().has("token")).toBe(false);
  expect($styleSourceSelections.get().get("instance")).toEqual({
    instanceId: "instance",
    values: [],
  });
  expect($styles.get().has(getStyleDeclKey(styleDecl))).toBe(false);
  expect($selectedStyleSources.get().has("instance")).toBe(false);
});
