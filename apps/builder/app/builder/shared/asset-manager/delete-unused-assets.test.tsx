import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $assetFolders,
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
} from "~/shared/sync/data-stores";
import {
  $authPermit,
  $builderMode,
  $selectedPageId,
} from "~/shared/nano-states";
import { registerContainers, serverSyncStore } from "~/shared/sync/sync-stores";
import {
  DeleteUnusedAssetsDialog,
  openDeleteUnusedAssetsDialog,
} from "./delete-unused-assets";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
registerContainers();

const createAsset = (id: string): Asset => ({
  id,
  projectId: "project",
  name: `${id}.png`,
  format: "png",
  size: 1,
  type: "image",
  meta: { width: 1, height: 1 },
  createdAt: "2026-01-01T00:00:00.000Z",
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  const pages = createDefaultPages({ rootInstanceId: "body" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $builderMode.set("design");
  $authPermit.set("build");
  $instances.set(
    new Map([
      [
        "body",
        {
          type: "instance" as const,
          id: "body",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
  $props.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $projectSettings.set({ meta: {}, compiler: {} });
  $assetFolders.set(new Map());
  const first = createAsset("first");
  const second = createAsset("second");
  $assets.set(
    new Map([
      [first.id, first],
      [second.id, second],
    ])
  );
});

afterEach(() => {
  renderer.cleanup();
  $assets.set(new Map());
  vi.unstubAllGlobals();
});

test("selects unused assets individually and deletes only selected assets", () => {
  act(() => openDeleteUnusedAssetsDialog());
  renderer.render(
    <TooltipProvider>
      <DeleteUnusedAssetsDialog />
    </TooltipProvider>
  );

  const first = document.querySelector<HTMLButtonElement>(
    "#unused-asset-first"
  );
  const second = document.querySelector<HTMLButtonElement>(
    "#unused-asset-second"
  );
  const selectAll = document.querySelector<HTMLButtonElement>(
    "#select-all-unused-assets"
  );

  expect(first?.getAttribute("aria-checked")).toBe("true");
  expect(second?.getAttribute("aria-checked")).toBe("true");
  expect(selectAll?.getAttribute("aria-checked")).toBe("true");

  act(() => selectAll?.click());

  expect(first?.getAttribute("aria-checked")).toBe("false");
  expect(second?.getAttribute("aria-checked")).toBe("false");
  expect(
    Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Delete"
    )?.disabled
  ).toBe(true);

  act(() => selectAll?.click());
  act(() => second?.click());

  expect(second?.getAttribute("aria-checked")).toBe("false");
  expect(selectAll?.getAttribute("aria-checked")).toBe("false");

  act(() => selectAll?.click());

  expect(first?.getAttribute("aria-checked")).toBe("true");
  expect(second?.getAttribute("aria-checked")).toBe("true");

  act(() => second?.click());
  act(() => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Delete")
      ?.click();
  });

  expect($assets.get().has("first")).toBe(false);
  expect($assets.get().has("second")).toBe(true);
});
