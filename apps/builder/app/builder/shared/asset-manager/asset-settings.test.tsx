import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Asset } from "@webstudio-is/sdk";
import { $authPermit } from "~/shared/nano-states";
import { createAssetManagerTestRenderer } from "./test-utils";
import { AssetDeleteDialog, AssetSettings } from "./asset-settings";

const renderer = createAssetManagerTestRenderer();
type ImageAsset = Extract<Asset, { type: "image" }>;
const assetBase = {
  id: "asset",
  projectId: "project",
  size: 100,
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-02-15T12:00:00.000Z",
} as const;
const createImageAsset = (values: Partial<ImageAsset> = {}): ImageAsset => ({
  ...assetBase,
  name: "image.png",
  format: "png",
  type: "image",
  meta: { width: 100, height: 100 },
  ...values,
});
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
afterEach(() => {
  renderer.cleanup();
  $authPermit.set("build");
});

test("describes an unused asset in the delete confirmation", () => {
  renderer.render(
    <AssetDeleteDialog
      open
      onOpenChange={vi.fn()}
      asset={{
        ...assetBase,
        name: "document.pdf",
        format: "pdf",
        type: "file",
        meta: {},
      }}
    />
  );

  expect(document.body.textContent).toContain("Delete “document.pdf”?");
  expect(document.body.textContent).not.toContain("cannot be undone");
  expect(document.activeElement?.textContent).toBe("Delete");
});

test("uses an auto-growing textarea for the asset description", () => {
  renderer.render(
    <TooltipProvider>
      <AssetSettings
        open
        onOpenChange={vi.fn()}
        asset={createImageAsset({
          description: "A useful description",
        })}
      >
        <button>Anchor</button>
      </AssetSettings>
    </TooltipProvider>
  );

  const description = document.querySelector<HTMLTextAreaElement>(
    "#asset-manager-description"
  );
  expect(description?.value).toBe("A useful description");
  expect(description?.rows).toBe(1);
  expect(
    document.querySelector('label[for="asset-manager-description"]')
  ).toBeInstanceOf(HTMLLabelElement);
  expect(document.body.textContent).toContain("Asset settings");
  const settingsIndicator = document.querySelector<HTMLElement>(
    "[data-asset-settings-usage-indicator]"
  );
  const thumbnailIndicator = document.querySelector<HTMLElement>(
    "[data-asset-thumbnail-indicator]"
  );
  expect(settingsIndicator).toBeInstanceOf(HTMLElement);
  expect(settingsIndicator?.className).toBe(thumbnailIndicator?.className);
  expect(document.body.textContent).toContain("Created");
  expect(document.body.textContent).toContain("Last modified");
  expect(document.body.textContent).toContain("Jan 15, 2026");
  expect(document.body.textContent).toContain("Feb 15, 2026");
});

test("closes asset settings before replacing an asset", () => {
  const onOpenChange = vi.fn();
  const onReplace = vi.fn();
  renderer.render(
    <TooltipProvider>
      <AssetSettings
        open
        onOpenChange={onOpenChange}
        onReplace={onReplace}
        asset={createImageAsset()}
      >
        <button>Anchor</button>
      </AssetSettings>
    </TooltipProvider>
  );

  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Replace asset"]')
      ?.click();
  });

  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onReplace).toHaveBeenCalledOnce();
});

test("keeps asset metadata read-only in View mode", () => {
  $authPermit.set("view");
  renderer.render(
    <TooltipProvider>
      <AssetSettings
        open
        onOpenChange={vi.fn()}
        asset={createImageAsset({ description: "A useful description" })}
      >
        <button>Anchor</button>
      </AssetSettings>
    </TooltipProvider>
  );

  expect(
    document.querySelector<HTMLInputElement>("#asset-manager-filename")
      ?.readOnly
  ).toBe(true);
  expect(
    document.querySelector<HTMLTextAreaElement>("#asset-manager-description")
      ?.readOnly
  ).toBe(true);
});
