import { afterEach, describe, expect, test, vi } from "vitest";
import { AssetThumbnailCard } from "./asset-thumbnail-card";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
afterEach(renderer.cleanup);

describe("AssetThumbnailCard", () => {
  test("renders folder and Back thumbnails as native buttons", () => {
    const onClick = vi.fn();
    const container = renderer.render(
      <AssetThumbnailCard
        as="button"
        type="button"
        preview={<span data-testid="preview">icon</span>}
        label="Back"
        clickable
        onClick={onClick}
      />
    );

    const button = container.querySelector("button");
    expect(button?.type).toBe("button");
    expect(button?.textContent).toBe("iconBack");
    expect(container.querySelector("[data-testid=preview]")).not.toBeNull();

    button?.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("renders asset metadata in the same thumbnail component", () => {
    const container = renderer.render(
      <AssetThumbnailCard
        preview={<span>preview</span>}
        label="Hero"
        labelSuffix=".png"
        path="Root / Images"
        tabIndex={0}
      >
        <span>asset actions</span>
      </AssetThumbnailCard>
    );

    expect(container.querySelector("button")).toBeNull();
    expect(container.firstElementChild?.getAttribute("tabindex")).toBe("0");
    expect(container.textContent).toBe(
      "previewHero.pngRoot / Imagesasset actions"
    );
  });
});
