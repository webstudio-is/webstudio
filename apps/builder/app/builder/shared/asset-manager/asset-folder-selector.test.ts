import { createElement } from "react";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  AssetFolderSelector,
  createAssetFolderSelectorLevels,
  getAssetFolderSelectValue,
} from "./asset-folder-selector";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture as folders,
} from "@webstudio-is/sdk/testing";
import { $assetFolders } from "~/shared/sync/data-stores";
import { createAssetManagerTestRenderer } from "./test-utils";

const folder = (id: string, parentId?: string) =>
  createAssetFolderFixture({ id, parentId });
const renderer = createAssetManagerTestRenderer();

afterEach(() => {
  renderer.cleanup();
  $assetFolders.set(new Map());
});

const selectOption = (triggerLabel: string, optionLabel: string) => {
  const trigger = document.querySelector<HTMLButtonElement>(
    `[aria-label="${triggerLabel}"]`
  );
  expect(trigger).toBeInstanceOf(HTMLButtonElement);
  act(() => {
    trigger?.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
  });
  const option = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((candidate) => candidate.textContent === optionLabel);
  expect(option).toBeInstanceOf(HTMLElement);
  act(() => {
    option?.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
    option?.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        pointerId: 1,
        pointerType: "mouse",
      })
    );
  });
};

describe("asset folder selector levels", () => {
  const values = folders(
    folder("parent"),
    folder("child", "parent"),
    folder("grandchild", "child"),
    folder("sibling")
  );

  test("selects every segment of the current folder path", () => {
    const levels = createAssetFolderSelectorLevels({
      folders: values,
      value: "grandchild",
    });

    expect(levels.map(({ selected }) => selected.folderId)).toEqual([
      "parent",
      "child",
      "grandchild",
    ]);
    expect(levels[0].options.map(({ folderId }) => folderId)).toEqual([
      undefined,
      "parent",
      "sibling",
    ]);
    expect(levels[0].options[0].label).toBe("Root");
  });

  test("excludes a folder and all descendants when choosing its parent", () => {
    const levels = createAssetFolderSelectorLevels({
      folders: values,
      value: undefined,
      excludedFolderIds: new Set(["parent"]),
    });

    expect(levels).toHaveLength(1);
    expect(levels[0].options.map(({ folderId }) => folderId)).toEqual([
      undefined,
      "sibling",
    ]);
  });

  test("excludes multiple folders and all of their descendants", () => {
    const levels = createAssetFolderSelectorLevels({
      folders: values,
      value: undefined,
      excludedFolderIds: new Set(["parent", "sibling"]),
    });

    expect(levels[0].options.map(({ folderId }) => folderId)).toEqual([
      undefined,
    ]);
  });

  test("supports context-specific labeling for the root level", () => {
    const [level] = createAssetFolderSelectorLevels({
      folders: values,
      value: undefined,
      rootLabel: "Parent folder",
    });

    expect(level.ariaLabel).toBe("Parent folder");
  });

  test("falls back to Root when the selected folder no longer exists", () => {
    const [level] = createAssetFolderSelectorLevels({
      folders: values,
      value: "missing",
    });

    expect(level.selected).toEqual({
      label: "Root",
      folderId: undefined,
      canUseAsDestination: true,
    });
  });

  test("blocks only exact unavailable destinations while preserving their descendants", () => {
    const levels = createAssetFolderSelectorLevels({
      folders: values,
      value: "grandchild",
      unavailableDestinationFolderIds: new Set(["parent"]),
    });

    expect(
      levels.flatMap(({ options }) =>
        options
          .filter(({ folderId }) => folderId === "parent")
          .map(({ canUseAsDestination }) => canUseAsDestination)
      )
    ).toEqual([false, false]);
    expect(
      levels.flatMap(({ options }) =>
        options
          .filter(
            ({ folderId }) => folderId === "child" || folderId === "grandchild"
          )
          .map(({ canUseAsDestination }) => canUseAsDestination)
      )
    ).toEqual([true, true, true]);
  });

  test("navigates through an unavailable destination and commits its descendant", () => {
    $assetFolders.set(values);
    const onChange = vi.fn();
    renderer.render(
      createElement(AssetFolderSelector, {
        value: undefined,
        onChange,
        unavailableDestinationFolderIds: new Set(["parent"]),
      })
    );

    selectOption("Top level folder", "parent");

    expect(onChange).not.toHaveBeenCalled();
    expect(
      document.querySelector('[aria-label="Asset subfolder level 1"]')
    ).toBeInstanceOf(HTMLButtonElement);

    selectOption("Asset subfolder level 1", "child");

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("child");
  });

  test("uses non-empty unique select values for Root and folders", () => {
    expect(getAssetFolderSelectValue({ folderId: undefined })).toBe(
      "no-folder"
    );
    expect(getAssetFolderSelectValue({ folderId: "no-folder" })).toBe(
      "folder:no-folder"
    );
  });
});
