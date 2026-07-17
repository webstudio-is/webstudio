import { afterEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { createAssetManagerTestRenderer } from "./test-utils";
import { AssetDeleteDialog, AssetSettings } from "./asset-settings";

const renderer = createAssetManagerTestRenderer();
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
afterEach(renderer.cleanup);

test("describes an unused asset in the delete confirmation", () => {
  renderer.render(
    <AssetDeleteDialog
      open
      onOpenChange={vi.fn()}
      asset={{
        id: "asset",
        projectId: "project",
        name: "document.pdf",
        format: "pdf",
        size: 100,
        type: "file",
        meta: {},
        createdAt: "2026-01-01T00:00:00.000Z",
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
        asset={{
          id: "asset",
          projectId: "project",
          name: "image.png",
          format: "png",
          size: 100,
          type: "image",
          meta: { width: 100, height: 100 },
          description: "A useful description",
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
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
});
