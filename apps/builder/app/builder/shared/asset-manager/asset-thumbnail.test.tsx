import { Fragment } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { AssetThumbnail } from "./asset-thumbnail";
import { BackThumbnail, FolderThumbnail } from "./asset-folder-thumbnail";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
afterEach(renderer.cleanup);

describe("AssetThumbnail", () => {
  test("renders asset, folder, and Back components through the shared card", () => {
    const container = renderer.render(
      <Fragment>
        <AssetThumbnail
          assetContainer={{
            status: "uploading",
            objectURL: "blob:document",
            asset: {
              id: "asset",
              name: "document.pdf",
              filename: undefined,
              format: "pdf",
              description: undefined,
              type: "file",
              folderId: "folder",
            },
          }}
          onSelect={vi.fn()}
        />
        <FolderThumbnail
          folder={{
            id: "folder",
            projectId: "project",
            name: "Documents",
            createdAt: "2026-01-01T00:00:00.000Z",
          }}
          selected={false}
          canManage={false}
          onSelect={vi.fn()}
          canMoveFolder={() => false}
          onOpen={vi.fn()}
          onMoveAsset={vi.fn()}
          onMoveFolder={vi.fn()}
        />
        <BackThumbnail onOpen={vi.fn()} />
      </Fragment>
    );

    const thumbnails = container.querySelectorAll("[data-asset-thumbnail]");
    expect(thumbnails).toHaveLength(3);
    expect(thumbnails[0]?.tagName).toBe("BUTTON");
    expect(thumbnails[1]?.tagName).toBe("BUTTON");
    expect(thumbnails[2]?.tagName).toBe("BUTTON");
    expect(container.textContent).toContain("document.pdf");
    expect(container.textContent).toContain("Documents");
    expect(container.textContent).toContain("Back");

    const backIcon = thumbnails[2]?.querySelector("svg");
    expect(backIcon?.children).toHaveLength(1);
    expect(backIcon?.firstElementChild?.tagName).toBe("path");
    expect(backIcon?.firstElementChild?.getAttribute("vector-effect")).toBe(
      "non-scaling-stroke"
    );
  });

  test("opens folders on double-click or keyboard activation only", () => {
    const onOpen = vi.fn();
    const onSelect = vi.fn();
    const container = renderer.render(
      <FolderThumbnail
        selected
        folder={{
          id: "folder",
          projectId: "project",
          name: "Documents",
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        canManage={false}
        onSelect={onSelect}
        canMoveFolder={() => false}
        onOpen={onOpen}
        onMoveAsset={vi.fn()}
        onMoveFolder={vi.fn()}
      />
    );

    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    button?.click();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();

    button?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onOpen).toHaveBeenCalledOnce();

    button?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(onOpen).toHaveBeenCalledTimes(2);

    button?.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  test("skips folder settings with Tab and reaches it with arrow keys", () => {
    const container = renderer.render(
      <TooltipProvider>
        <FolderThumbnail
          selected={false}
          folder={{
            id: "folder",
            projectId: "project",
            name: "Documents",
            createdAt: "2026-01-01T00:00:00.000Z",
          }}
          canManage
          onSelect={vi.fn()}
          canMoveFolder={() => false}
          onOpen={vi.fn()}
          onMoveAsset={vi.fn()}
          onMoveFolder={vi.fn()}
        />
      </TooltipProvider>
    );

    const thumbnail = container.querySelector<HTMLButtonElement>(
      '[aria-label="Folder Documents"]'
    );
    const settings = container.querySelector<HTMLButtonElement>(
      '[aria-label="Settings for Documents"]'
    );

    expect(thumbnail?.tabIndex).toBe(0);
    expect(settings?.tabIndex).toBe(-1);

    thumbnail?.focus();
    thumbnail?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(document.activeElement).toBe(settings);

    settings?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    expect(document.activeElement).toBe(thumbnail);
  });

  test("skips asset details with Tab and reaches it with arrow keys", () => {
    const container = renderer.render(
      <AssetThumbnail
        assetContainer={{
          status: "uploaded",
          asset: {
            id: "asset",
            projectId: "project",
            name: "document.pdf",
            format: "pdf",
            size: 100,
            type: "file",
            meta: {},
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }}
        onSelect={vi.fn()}
      />
    );

    const thumbnail = container.querySelector<HTMLButtonElement>(
      "[data-asset-thumbnail]"
    );
    const details =
      container.querySelector<HTMLButtonElement>('[title="Options"]');

    expect(thumbnail?.tabIndex).toBe(0);
    expect(details?.tabIndex).toBe(-1);

    thumbnail?.focus();
    thumbnail?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(document.activeElement).toBe(details);

    details?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    expect(document.activeElement).toBe(thumbnail);
  });
});
