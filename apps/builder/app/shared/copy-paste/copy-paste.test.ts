import { afterEach, expect, test, vi } from "vitest";
import { enableMapSet } from "immer";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Instance } from "@webstudio-is/sdk";
import { registerContainers } from "../sync/sync-stores";
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
} from "../sync/data-stores";
import { $authTokenPermissions } from "../nano-states";
import { copyPage } from "./copy-paste";

enableMapSet();
registerContainers();

const resetStores = () => {
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: false,
  });
  $instances.set(new Map());
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $assets.set(new Map());
};

const setupPage = () => {
  const pages = createDefaultPages({
    homePageId: "page-id",
    rootInstanceId: "body-id",
  });
  $pages.set(pages);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
};

afterEach(() => {
  resetStores();
  vi.unstubAllGlobals();
});

test("does not copy page to clipboard when copy permission is disabled", async () => {
  resetStores();
  setupPage();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });
  $authTokenPermissions.set({
    canClone: true,
    canCopy: false,
    canPublish: false,
  });

  await copyPage("page-id");

  expect(writeText).not.toHaveBeenCalled();
});
