import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { createAssetFolderHierarchy } from "@webstudio-is/sdk";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { AssetFolderBreadcrumbs } from "./asset-folder-breadcrumbs";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
const writeText = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  renderer.cleanup();
  writeText.mockReset();
  vi.unstubAllGlobals();
});

const parent = createAssetFolderFixture({ id: "parent", name: "Documents" });
const child = createAssetFolderFixture({
  id: "child",
  parentId: parent.id,
  name: "Articles",
});
const hierarchy = createAssetFolderHierarchy(
  createAssetFoldersFixture(parent, child)
);

const renderBreadcrumbs = (
  selectedItem:
    | { type: "folder"; id: string }
    | { type: "asset"; folderId: string; name: string }
) =>
  renderer.render(
    <TooltipProvider>
      <AssetFolderBreadcrumbs
        hierarchy={hierarchy}
        folderId={parent.id}
        selectedItem={selectedItem}
        onChange={vi.fn()}
      />
    </TooltipProvider>
  );

const copyPath = () => {
  act(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Copy path"]')
      ?.click();
  });
};

test("shows and copies the selected folder path", () => {
  renderBreadcrumbs({ type: "folder", id: child.id });

  expect(document.body.textContent).toContain("RootDocumentsArticles");
  copyPath();
  expect(writeText).toHaveBeenCalledWith("Root / Documents / Articles");
});

test("shows and copies the selected asset path", () => {
  renderBreadcrumbs({
    type: "asset",
    folderId: child.id,
    name: "welcome.md",
  });

  expect(document.body.textContent).toContain(
    "RootDocumentsArticleswelcome.md"
  );
  copyPath();
  expect(writeText).toHaveBeenCalledWith(
    "Root / Documents / Articles / welcome.md"
  );
});
