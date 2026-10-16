import { enableMapSet } from "immer";
import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { StyleDecl } from "@webstudio-is/sdk";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $selectedStyleSources } from "~/shared/nano-states";
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
import { addStyleSourceToInstance, __testing__ } from "./style-source-section";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";

const {
  clearStyles,
  convertLocalStyleSourceToToken,
  duplicateStyleSource,
  reorderStyleSources,
} = __testing__;

enableMapSet();
registerContainers();

const setupSelectedBody = () => {
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
  $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
  $styles.set(new Map());
  selectInstance(["body"]);
};

test("add style source to instance", () => {
  setupSelectedBody();
  $styleSources.set(
    new Map([
      ["token1", { id: "token1", type: "token", name: "Token 1" }],
      ["token2", { id: "token2", type: "token", name: "Token 2" }],
      ["local1", { id: "local1", type: "local" }],
    ])
  );
  $styleSourceSelections.set(
    new Map([["body", { instanceId: "body", values: ["local1"] }]])
  );
  $selectedStyleSources.set(new Map());

  addStyleSourceToInstance("token1");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1", "local1"],
  });
  expect($selectedStyleSources.get().get("body")).toEqual("token1");

  // put new token before local
  addStyleSourceToInstance("token2");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1", "token2", "local1"],
  });
});

test("duplicate locked style source creates an unlocked copy", () => {
  setupSelectedBody();
  const styleDecl: StyleDecl = {
    breakpointId: "base",
    styleSourceId: "token1",
    property: "color",
    value: { type: "keyword" as const, value: "red" },
  };
  $styleSources.set(
    new Map([
      [
        "token1",
        { id: "token1", type: "token", name: "Primary", locked: true },
      ],
    ])
  );
  $styleSourceSelections.set(
    new Map([["body", { instanceId: "body", values: ["token1"] }]])
  );
  $selectedStyleSources.set(new Map([["body", "token1"]]));
  $styles.set(
    new Map([
      [
        `${styleDecl.styleSourceId}:${styleDecl.breakpointId}:${styleDecl.property}:`,
        styleDecl,
      ],
    ])
  );

  const duplicatedId = duplicateStyleSource("token1");

  expect(duplicatedId).toBeDefined();
  const duplicatedStyleSource = $styleSources.get().get(duplicatedId!);
  expect(duplicatedStyleSource).toEqual({
    id: duplicatedId,
    type: "token",
    name: "Primary (copy)",
  });
  expect($styleSourceSelections.get().get("body")?.values).toEqual([
    "token1",
    duplicatedId,
  ]);
  expect(
    Array.from($styles.get().values()).some(
      (style) => style.styleSourceId === duplicatedId
    )
  ).toEqual(true);
});

test("converts placeholder local style source to runtime-created token", () => {
  setupSelectedBody();
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
  $selectedStyleSources.set(new Map());

  convertLocalStyleSourceToToken("placeholder-local");

  const styleSources = Array.from($styleSources.get().values());
  expect(styleSources).toEqual([
    expect.objectContaining({
      type: "token",
      id: expect.any(String),
      name: "Local (Copy)",
    }),
  ]);
  const tokenId = styleSources[0]?.id;
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: [tokenId],
  });
  expect($selectedStyleSources.get().get("body")).toEqual(tokenId);
});

test("reorders and clears styles through runtime mutations", () => {
  setupSelectedBody();
  const tokenStyle: StyleDecl = {
    breakpointId: "base",
    styleSourceId: "token1",
    property: "color",
    value: { type: "keyword" as const, value: "red" },
  };
  const localStyle: StyleDecl = {
    breakpointId: "base",
    styleSourceId: "local1",
    property: "color",
    value: { type: "keyword" as const, value: "blue" },
  };
  $styleSources.set(
    new Map([
      ["token1", { id: "token1", type: "token", name: "Primary" }],
      ["local1", { id: "local1", type: "local" }],
    ])
  );
  $styleSourceSelections.set(
    new Map([["body", { instanceId: "body", values: ["token1", "local1"] }]])
  );
  $styles.set(
    new Map([
      ["token1:base:color:", tokenStyle],
      ["local1:base:color:", localStyle],
    ])
  );

  reorderStyleSources(["local1", "token1"]);
  expect($styleSourceSelections.get().get("body")?.values).toEqual([
    "local1",
    "token1",
  ]);

  clearStyles("token1");
  expect($styles.get().has("token1:base:color:")).toEqual(false);
  expect($styles.get().get("local1:base:color:")).toEqual(localStyle);
});

test("reorders style sources while local style source is temporary", () => {
  setupSelectedBody();
  $styleSources.set(
    new Map([
      ["token1", { id: "token1", type: "token", name: "Primary" }],
      ["token2", { id: "token2", type: "token", name: "Secondary" }],
    ])
  );
  $styleSourceSelections.set(
    new Map([["body", { instanceId: "body", values: ["token1", "token2"] }]])
  );

  reorderStyleSources(["token2", "token1", "temporary-local"]);

  expect($styleSourceSelections.get().get("body")?.values).toEqual([
    "token2",
    "token1",
  ]);
});
