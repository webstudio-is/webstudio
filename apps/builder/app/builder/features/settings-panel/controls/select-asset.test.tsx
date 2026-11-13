import { page } from "@vitest/browser/context";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import { createAssetFolderFixture } from "@webstudio-is/sdk/testing";
import { $assets, $assetFolders } from "~/shared/sync/data-stores";
import { $authPermit } from "~/shared/nano-states";
import { createAssetManagerTestRenderer } from "~/builder/shared/asset-manager/test-utils";
import { SelectAsset } from "./select-asset";

const renderer = createAssetManagerTestRenderer();
const asset: Asset = {
  id: "image",
  projectId: "project",
  name: "image.svg",
  filename: "A long image name that should not widen the source picker",
  format: "svg",
  type: "image",
  size: 100,
  meta: { width: 100, height: 100 },
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  $authPermit.set("build");
  $assets.set(new Map([[asset.id, asset]]));
  $assetFolders.set(new Map());
});

afterEach(() => {
  renderer.cleanup();
  $assets.set(new Map());
  $assetFolders.set(new Map());
});

const openPicker = async (onChange = vi.fn()) => {
  renderer.render(
    <TooltipProvider>
      <div data-floating-panel-container style={{ width: 260, height: 600 }}>
        <SelectAsset accept="image/*" onChange={onChange} />
      </div>
    </TooltipProvider>
  );
  await act(async () => {
    await page.getByRole("button", { name: "Choose source" }).click();
  });
  await expect
    .element(page.getByRole("dialog", { name: "Images" }))
    .toBeVisible();
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  const thumbnail = dialog.querySelector<HTMLButtonElement>(
    "[data-asset-manager-thumbnail-button]"
  )!;
  // Let opening layout and the initial resize observer delivery finish.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  return { dialog, thumbnail, onChange };
};

test.each([false, true])(
  "keeps the source picker width when selecting an image (nested: %s)",
  async (nested) => {
    if (nested) {
      const parent = createAssetFolderFixture({
        id: "parent",
        name: "A long parent folder name",
      });
      const folder = createAssetFolderFixture({
        id: "folder",
        parentId: parent.id,
        name: "A long nested folder name",
      });
      $assetFolders.set(
        new Map([
          [parent.id, parent],
          [folder.id, folder],
        ])
      );
      $assets.set(new Map([[asset.id, { ...asset, folderId: folder.id }]]));
    }
    const { dialog } = await openPicker();
    if (nested) {
      await act(async () => {
        await page.getByRole("textbox", { name: "Search" }).fill("image");
      });
    }
    const thumbnail = dialog.querySelector<HTMLButtonElement>(
      "[data-asset-manager-thumbnail-button]"
    )!;
    const width = dialog.getBoundingClientRect().width;
    expect(width).toBe(240);
    act(() => thumbnail.focus());
    await new Promise(requestAnimationFrame);
    expect(dialog.getBoundingClientRect().width).toBe(width);
  }
);

test("chooses an image with a quick thumbnail click", async () => {
  const { thumbnail, onChange } = await openPicker();
  const preview = thumbnail.firstElementChild!;
  // Allow a frame between press and release, as with a normal mouse click.
  await act(async () => {
    await page.elementLocator(preview).click({ delay: 80 });
  });
  expect(onChange).toHaveBeenCalledExactlyOnceWith(asset.id);
  await expect
    .element(page.getByRole("dialog", { name: "Images" }))
    .not.toBeInTheDocument();
});
