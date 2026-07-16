import { Fragment } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
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
    expect(thumbnails[0]?.tagName).toBe("DIV");
    expect(thumbnails[1]?.tagName).toBe("BUTTON");
    expect(thumbnails[2]?.tagName).toBe("BUTTON");
    expect(container.textContent).toContain("document.pdf");
    expect(container.textContent).toContain("Documents");
    expect(container.textContent).toContain("Back");
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
});
