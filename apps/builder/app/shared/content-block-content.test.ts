import { afterEach, expect, test } from "vitest";
import type { Project } from "@webstudio-is/project";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type ContentBlockExternalContentIdentity,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  $instances,
  $project,
  $props,
  $assets,
  $breakpoints,
  $dataSources,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
  resetDataStores,
} from "./sync/data-stores";
import {
  $runtimeInstances,
  getRuntimeInstanceChildren,
  publishMaterializedContentRoot,
  resetMaterializedContent,
} from "./content-block-content";

const identity = (
  renderScope: string
): ContentBlockExternalContentIdentity => ({
  blockInstanceId: "block",
  assetId: renderScope,
  revision: `sha256:${renderScope}`,
  contentRef: `${renderScope}.mdx`,
  format: "mdx",
  renderScope,
});

const fragment = (id: string): WebstudioFragment => ({
  children: [{ type: "id", value: id }],
  instances: [
    {
      type: "instance",
      id,
      component: elementComponent,
      tag: "p",
      children: [{ type: "text", value: id }],
    },
  ],
  props: [],
  assets: [],
  dataSources: [],
  resources: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
});

afterEach(() => {
  resetMaterializedContent();
  resetDataStores();
  $project.set(undefined);
});

test("projects repeated MDX roots by selector without changing persisted instances", () => {
  $project.set({ id: "project" } as Project);
  const persistedBlock = {
    type: "instance" as const,
    id: "block",
    component: blockComponent,
    children: [{ type: "id" as const, value: "templates" }],
  };
  $instances.set(
    new Map([
      [persistedBlock.id, persistedBlock],
      [
        "templates",
        {
          type: "instance" as const,
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "expression" as const,
          value: "article",
        },
      ],
    ])
  );
  $assets.set(new Map());
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  const firstScope = JSON.stringify(["block", "collection[0]"]);
  const secondScope = JSON.stringify(["block", "collection[1]"]);
  publishMaterializedContentRoot({
    identity: identity(firstScope),
    fragment: fragment("first-content"),
  });
  publishMaterializedContentRoot({
    identity: identity(secondScope),
    fragment: fragment("second-content"),
  });

  const runtimeBlock = $runtimeInstances.get().get("block");
  if (runtimeBlock === undefined) {
    throw new Error("Expected projected Content Block");
  }
  expect($runtimeInstances.get().has("first-content")).toBe(true);
  expect($runtimeInstances.get().has("second-content")).toBe(true);
  expect(
    getRuntimeInstanceChildren(runtimeBlock, ["block", "collection[0]"])
  ).toEqual([
    { type: "id", value: "templates" },
    { type: "id", value: "first-content" },
  ]);
  expect(
    getRuntimeInstanceChildren(runtimeBlock, ["block", "collection[1]"])
  ).toEqual([
    { type: "id", value: "templates" },
    { type: "id", value: "second-content" },
  ]);
  expect($instances.get()).toEqual(
    new Map([
      [persistedBlock.id, persistedBlock],
      [
        "templates",
        {
          type: "instance",
          id: "templates",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ])
  );

  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "asset",
          value: "replacement",
        },
      ],
    ])
  );
  expect($runtimeInstances.get().has("first-content")).toBe(true);

  $props.set(new Map());
  expect($runtimeInstances.get().has("first-content")).toBe(false);
  expect($runtimeInstances.get().get("block")?.children).toEqual([
    { type: "id", value: "templates" },
  ]);

  $props.set(
    new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: "expression",
          value: "article",
        },
      ],
    ])
  );
  publishMaterializedContentRoot({
    identity: identity(firstScope),
    fragment: fragment("first-content"),
  });
  expect($runtimeInstances.get().has("first-content")).toBe(true);

  $project.set({ id: "other-project" } as Project);
  expect($runtimeInstances.get().has("first-content")).toBe(false);
});
