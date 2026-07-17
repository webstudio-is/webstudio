import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
  $project,
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
import { AssetManager } from "./asset-manager";
import { $assetManagerClipboard } from "./asset-manager-clipboard";
import {
  createAssetFolderFixture,
  createAssetFoldersFixture,
} from "@webstudio-is/sdk/testing";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
registerContainers();

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal(
    "DOMRect",
    class {
      static fromRect(rect: Partial<DOMRect> = {}) {
        const x = rect.x ?? 0;
        const y = rect.y ?? 0;
        const width = rect.width ?? 0;
        const height = rect.height ?? 0;
        return {
          x,
          y,
          width,
          height,
          top: y,
          right: x + width,
          bottom: y + height,
          left: x,
          toJSON: () => ({}),
        };
      }
    }
  );
  $assets.set(new Map());
  $assetManagerClipboard.set(undefined);
  $authPermit.set("build");
  serverSyncStore.transactionManager.currentStack = [];
  serverSyncStore.transactionManager.undoneStack = [];
  serverSyncStore.popAll();
  const pages = createDefaultPages({ rootInstanceId: "body" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $builderMode.set("design");
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
  $project.set({ id: "project" } as never);
  $assetFolders.set(
    createAssetFoldersFixture(
      createAssetFolderFixture({ id: "alpha", name: "Alpha" }),
      createAssetFolderFixture({ id: "bravo", name: "Bravo" }),
      createAssetFolderFixture({ id: "charlie", name: "Charlie" })
    )
  );
});

afterEach(() => {
  renderer.cleanup();
  $assetFolders.set(new Map());
  $assets.set(new Map());
  $assetManagerClipboard.set(undefined);
  $project.set(undefined);
  vi.unstubAllGlobals();
});

const renderManager = (canManageFolders = true) =>
  renderer.render(
    <TooltipProvider>
      <AssetManager canManageFolders={canManageFolders} />
    </TooltipProvider>
  );

const getOptions = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="option"]')).map(
    (option) => ({
      option,
      button: option.querySelector<HTMLButtonElement>("button")!,
    })
  );

const pointerDown = (
  element: HTMLElement,
  modifiers: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } = {}
) => {
  act(() => {
    element.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        ...modifiers,
      })
    );
    element.focus();
  });
};

const keyDown = (
  element: HTMLElement,
  key: string,
  modifiers: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } = {}
) => {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      })
    );
  });
};

const openContextMenu = (element: HTMLElement) => {
  act(() => {
    element.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        cancelable: true,
      })
    );
  });
};

const dismissContextMenu = () => {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
  });
};

const selectContextMenuItem = (
  element: HTMLElement,
  label: "Copy" | "Cut" | "Duplicate" | "Delete"
) => {
  openContextMenu(element);
  const item = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((candidate) => candidate.textContent?.startsWith(label));
  expect(item).toBeDefined();
  act(() => item?.click());
};

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

describe("Asset Manager multiselect interactions", () => {
  test("marquee-selects every thumbnail intersecting the pointer rectangle", () => {
    const container = renderManager();
    const options = getOptions(container);
    const listbox = container.querySelector<HTMLElement>('[role="listbox"]')!;
    const viewport = listbox.closest<HTMLElement>(
      "[data-asset-manager-scroll-area]"
    )!;
    viewport.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 300,
        width: 300,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    options.forEach(({ button }, index) => {
      const left = 20 + index * 60;
      button.getBoundingClientRect = () =>
        ({
          left,
          top: 20,
          right: left + 50,
          bottom: 70,
          width: 50,
          height: 50,
          x: left,
          y: 20,
          toJSON: () => ({}),
        }) as DOMRect;
    });

    act(() => {
      viewport.dispatchEvent(
        new MouseEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 10,
          clientY: 10,
        })
      );
      document.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 125,
          clientY: 80,
        })
      );
    });

    expect(container.querySelector("[data-asset-manager-marquee]")).not.toBe(
      null
    );
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "true", "false"]);

    act(() => {
      document.dispatchEvent(
        new MouseEvent("pointerup", {
          bubbles: true,
          clientX: 125,
          clientY: 80,
        })
      );
    });
    expect(container.querySelector("[data-asset-manager-marquee]")).toBe(null);
    expect(document.activeElement).toBe(options[0]!.button);
  });

  test("keeps single selection focus-based until Shift + Click", () => {
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    expect(
      options.every(
        ({ option }) => option.hasAttribute("aria-selected") === false
      )
    ).toBe(true);

    pointerDown(options[2]!.button, { shiftKey: true });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "true", "true"]);

    pointerDown(options[1]!.button);
    act(() => options[1]?.button.click());
    expect(
      options.every(
        ({ option }) => option.hasAttribute("aria-selected") === false
      )
    ).toBe(true);
    expect(document.activeElement).toBe(options[1]!.button);
  });

  test("exits multiselect when clicking outside thumbnails", () => {
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options[2]!.button, { shiftKey: true });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "true", "true"]);

    pointerDown(container.querySelector<HTMLInputElement>("input")!);
    expect(
      options.every(
        ({ option }) => option.hasAttribute("aria-selected") === false
      )
    ).toBe(true);
  });

  test("keeps multiselect during pointer down so selected items can be dragged", () => {
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options[2]!.button, { metaKey: true });

    act(() => {
      options[2]?.button.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 })
      );
    });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "false", "true"]);

    act(() => options[2]?.button.click());
    expect(
      options.every(
        ({ option }) => option.hasAttribute("aria-selected") === false
      )
    ).toBe(true);
  });

  test.each([{ metaKey: true }, { ctrlKey: true }])(
    "initializes a non-contiguous selection with Cmd/Ctrl + Click",
    (modifier) => {
      const container = renderManager();
      const options = getOptions(container);
      act(() => options[0]?.button.focus());

      pointerDown(options[2]!.button, modifier);
      expect(
        options.map(({ option }) => option.getAttribute("aria-selected"))
      ).toEqual(["true", "false", "true"]);
    }
  );

  test.each([{ shiftKey: true }, { metaKey: true }, { ctrlKey: true }])(
    "initializes selection with a modifier + Arrow",
    (modifier) => {
      const container = renderManager();
      const options = getOptions(container);
      act(() => options[0]?.button.focus());
      act(() => {
        options[0]?.button.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
            ...modifier,
          })
        );
      });

      expect(
        options
          .slice(0, 2)
          .map(({ option }) => option.getAttribute("aria-selected"))
      ).toEqual(["true", "true"]);
      expect(document.activeElement).toBe(options[1]!.button);

      act(() => {
        options[1]?.button.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });
      expect(
        options.every(
          ({ option }) => option.hasAttribute("aria-selected") === false
        )
      ).toBe(true);
    }
  );

  test("preserves the range anchor while Shift + Arrow extends and contracts", () => {
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());

    keyDown(options[0]!.button, "ArrowRight", { shiftKey: true });
    keyDown(options[1]!.button, "ArrowRight", { shiftKey: true });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "true", "true"]);

    keyDown(options[2]!.button, "ArrowLeft", { shiftKey: true });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "true", "false"]);
    expect(document.activeElement).toBe(options[1]!.button);
  });

  test("toggles individual items without changing the original anchor", () => {
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());

    pointerDown(options[2]!.button, { metaKey: true });
    pointerDown(options[0]!.button, { metaKey: true });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["false", "false", "true"]);

    pointerDown(options[1]!.button, { ctrlKey: true });
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["false", "true", "true"]);
  });

  test("selects mixed items and applies a bulk action to the complete selection", () => {
    const asset = createAsset("asset");
    act(() => $assets.set(new Map([[asset.id, asset]])));
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options[3]!.button, { ctrlKey: true });

    expect(
      container
        .querySelector('[role="listbox"]')
        ?.getAttribute("aria-multiselectable")
    ).toBe("true");
    expect(
      options.map(({ option }) => option.getAttribute("aria-selected"))
    ).toEqual(["true", "false", "false", "true"]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "2 items selected."
    );

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Actions for asset.png"]'
        )
        ?.dispatchEvent(
          new MouseEvent("pointerdown", { bubbles: true, button: 0 })
        );
    });
    const copyItem = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent?.startsWith("Copy"));
    act(() => copyItem?.click());

    expect($assetManagerClipboard.get()).toEqual({
      operation: "copy",
      items: [
        { type: "folder", id: "charlie" },
        { type: "asset", id: "asset" },
      ],
      projectId: "project",
    });
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "2 items copied."
    );
  });

  test("clears forced selection and restores focus when results disappear", () => {
    const container = renderManager();
    let options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options[2]!.button, { metaKey: true });

    act(() => {
      $assetFolders.set(
        createAssetFoldersFixture(
          createAssetFolderFixture({ id: "bravo", name: "Bravo" })
        )
      );
    });
    options = getOptions(container);
    expect(options).toHaveLength(1);
    expect(options[0]?.option.hasAttribute("aria-selected")).toBe(false);
    expect(document.activeElement).toBe(options[0]!.button);
  });

  test("preserves bulk actions while interacting with a portaled menu", () => {
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options[2]!.button, { metaKey: true });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Actions for Alpha"]')
        ?.dispatchEvent(
          new MouseEvent("pointerdown", { bubbles: true, button: 0 })
        );
    });
    const deleteItem = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent?.startsWith("Delete"));
    expect(deleteItem).toBeDefined();
    act(() => {
      deleteItem?.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 })
      );
      deleteItem?.click();
    });
    expect(document.body.textContent).toContain("Delete selected items");
  });

  test.each(["Copy", "Cut"] as const)(
    "%s from the context menu targets the complete multiselection",
    (action) => {
      const asset = createAsset("asset");
      act(() => $assets.set(new Map([[asset.id, asset]])));
      const container = renderManager();
      const options = getOptions(container);
      openContextMenu(options[0]!.button);
      dismissContextMenu();
      act(() => options[0]?.button.focus());
      pointerDown(options.at(-1)!.button, { ctrlKey: true });

      selectContextMenuItem(options[0]!.button, action);

      const selectedFolderId = options[0]!.button
        .getAttribute("aria-label")
        ?.replace("Folder ", "")
        .toLowerCase();
      expect($assetManagerClipboard.get()).toEqual({
        operation: action.toLowerCase(),
        items: [
          { type: "folder", id: selectedFolderId },
          { type: "asset", id: "asset" },
        ],
        projectId: "project",
      });
    }
  );

  test("Duplicate from the context menu targets the complete multiselection", () => {
    const asset = createAsset("asset");
    act(() => $assets.set(new Map([[asset.id, asset]])));
    const container = renderManager();
    const options = getOptions(container);
    openContextMenu(options[0]!.button);
    dismissContextMenu();
    act(() => options[0]?.button.focus());
    pointerDown(options.at(-1)!.button, { ctrlKey: true });

    selectContextMenuItem(options[0]!.button, "Duplicate");

    expect($assetFolders.get()).toHaveLength(4);
    expect($assets.get()).toHaveLength(2);
  });

  test("Delete from the context menu targets the complete multiselection", () => {
    const asset = createAsset("asset");
    act(() => $assets.set(new Map([[asset.id, asset]])));
    const container = renderManager();
    const options = getOptions(container);
    openContextMenu(options[0]!.button);
    dismissContextMenu();
    act(() => options[0]?.button.focus());
    pointerDown(options.at(-1)!.button, { ctrlKey: true });

    selectContextMenuItem(options[0]!.button, "Delete");

    expect(document.body.textContent).toContain("Delete 2 selected items?");
  });

  test("Move from the context menu targets the complete multiselection", () => {
    const asset = createAsset("asset");
    act(() => $assets.set(new Map([[asset.id, asset]])));
    const container = renderManager();
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options.at(-1)!.button, { ctrlKey: true });

    openContextMenu(options[0]!.button);
    const moveItem = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find((item) => item.textContent === "Move");
    expect(moveItem).toBeDefined();
    act(() => moveItem?.click());

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Move items");
    expect(dialog.querySelectorAll("label")).toHaveLength(1);
    expect(dialog.querySelector("label")?.textContent).toBe("Folder");
  });

  test("thumbnail context requests replace the panel actions", () => {
    const upload = vi.fn();
    const container = renderer.render(
      <TooltipProvider>
        <AssetManager canManageFolders panelActions={{ upload }} />
      </TooltipProvider>
    );
    const options = getOptions(container);
    act(() => options[0]?.button.focus());
    pointerDown(options[2]!.button, { ctrlKey: true });

    act(() => {
      options[0]!.option.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          cancelable: true,
        })
      );
    });

    const labels = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).map((item) => item.textContent);
    expect(labels.some((label) => label?.startsWith("Copy"))).toBe(true);
    expect(labels).not.toContain("Upload asset");
  });
});

describe("Asset Manager shortcuts", () => {
  test("prevents handled shortcuts from reaching global builder commands", () => {
    const container = renderManager();
    const button = container.querySelector<HTMLButtonElement>(
      '[aria-label="Folder Alpha"]'
    )!;
    const globalHandler = vi.fn();
    document.addEventListener("keydown", globalHandler);
    act(() => button.focus());
    const event = new KeyboardEvent("keydown", {
      key: "c",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });

    act(() => button.dispatchEvent(event));
    document.removeEventListener("keydown", globalHandler);

    expect(event.defaultPrevented).toBe(true);
    expect(globalHandler).not.toHaveBeenCalled();
  });

  test.each([
    {
      label: "Folder Alpha",
      item: { type: "folder" as const, id: "alpha" },
    },
    {
      label: "asset.png",
      item: { type: "asset" as const, id: "asset" },
    },
  ])("copies and cuts the focused $item.type", ({ label, item }) => {
    const asset = createAsset("asset");
    act(() => $assets.set(new Map([[asset.id, asset]])));
    const container = renderManager();
    const button =
      item.type === "folder"
        ? container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
        : getOptions(container).at(-1)!.button;
    act(() => button.focus());

    keyDown(button, "c", { metaKey: true });
    expect($assetManagerClipboard.get()).toEqual({
      operation: "copy",
      items: [item],
      projectId: "project",
    });

    keyDown(button, "x", { ctrlKey: true });
    expect($assetManagerClipboard.get()).toEqual({
      operation: "cut",
      items: [item],
      projectId: "project",
    });
  });

  test("applies copy and duplicate shortcuts to the complete multiselection", () => {
    const asset = createAsset("asset");
    act(() => $assets.set(new Map([[asset.id, asset]])));
    const container = renderManager();
    const folderButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Folder Alpha"]'
    )!;
    const assetButton = getOptions(container).at(-1)!.button;
    act(() => folderButton.focus());
    pointerDown(assetButton, { ctrlKey: true });

    keyDown(assetButton, "c", { metaKey: true });
    expect($assetManagerClipboard.get()?.items).toEqual([
      { type: "folder", id: "alpha" },
      { type: "asset", id: "asset" },
    ]);

    keyDown(assetButton, "d", { ctrlKey: true });
    expect($assetFolders.get()).toHaveLength(4);
    expect($assets.get()).toHaveLength(2);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "2 items duplicated."
    );
  });

  test("pastes into the open folder with Cmd/Ctrl + V", () => {
    const asset = createAsset("asset");
    act(() => {
      $assets.set(new Map([[asset.id, asset]]));
      $assetManagerClipboard.set({
        operation: "copy",
        items: [{ type: "asset", id: asset.id }],
        projectId: "project",
      });
    });
    const container = renderManager();
    const button = getOptions(container).at(-1)!.button;
    act(() => button.focus());

    keyDown(button, "v", { metaKey: true });

    expect($assets.get()).toHaveLength(2);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "1 item pasted into Root."
    );
  });

  test.each(["Backspace", "Delete"])(
    "%s opens confirmation for the focused item",
    (key) => {
      const asset = createAsset("asset");
      act(() => $assets.set(new Map([[asset.id, asset]])));
      const container = renderManager();
      const button = getOptions(container).at(-1)!.button;
      act(() => button.focus());

      keyDown(button, key);

      expect(document.body.textContent).toContain("Delete 1 selected item?");
      expect(document.activeElement?.textContent).toBe("Delete");
      expect($assets.get()).toHaveLength(1);
    }
  );

  test("does not expose the delete shortcut in view mode", () => {
    const asset = createAsset("asset");
    act(() => {
      $assets.set(new Map([[asset.id, asset]]));
      $authPermit.set("view");
    });
    const container = renderManager(false);
    const button = getOptions(container).at(-1)!.button;
    act(() => button.focus());

    keyDown(button, "Delete");

    expect(document.body.textContent).not.toContain("Delete selected items");
    expect($assets.get()).toHaveLength(1);
  });

  test("leaves native editing shortcuts available in the search field", () => {
    const container = renderManager();
    const search = container.querySelector<HTMLInputElement>("input")!;
    act(() => search.focus());

    keyDown(search, "c", { metaKey: true });
    keyDown(search, "x", { ctrlKey: true });
    keyDown(search, "Backspace");

    expect($assetManagerClipboard.get()).toBeUndefined();
    expect(document.body.textContent).not.toContain("Delete selected items");
  });
});
