import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { __testing__ } from "./pages";

const {
  canEditPagesPanelItemSettings,
  canEditPagesTreeItemSettings,
  commitPageTemplateDrop,
  commitPagesTreeDrop,
  getPagesTreeDropTarget,
} = __testing__;

describe("canEditPagesTreeItemSettings", () => {
  test("allows page settings when page settings are editable", () => {
    expect(
      canEditPagesTreeItemSettings({
        itemType: "page",
        canManagePages: false,
        canEditPageSettings: true,
      })
    ).toBe(true);
  });

  test("keeps folder settings design-only", () => {
    expect(
      canEditPagesTreeItemSettings({
        itemType: "folder",
        canManagePages: false,
        canEditPageSettings: true,
      })
    ).toBe(false);
    expect(
      canEditPagesTreeItemSettings({
        itemType: "folder",
        canManagePages: true,
        canEditPageSettings: false,
      })
    ).toBe(true);
  });

  test("hides page settings when page settings are not editable", () => {
    expect(
      canEditPagesTreeItemSettings({
        itemType: "page",
        canManagePages: true,
        canEditPageSettings: false,
      })
    ).toBe(false);
  });
});

describe("canEditPagesPanelItemSettings", () => {
  const folders = new Map([
    [
      "folder-id",
      {
        id: "folder-id",
        name: "Folder",
        slug: "folder",
        children: [],
      },
    ],
  ]);

  test("keeps open folder settings design-only", () => {
    expect(
      canEditPagesPanelItemSettings({
        itemId: "folder-id",
        folders,
        canManagePages: false,
        canEditPageSettings: true,
      })
    ).toBe(false);
    expect(
      canEditPagesPanelItemSettings({
        itemId: "folder-id",
        folders,
        canManagePages: true,
        canEditPageSettings: false,
      })
    ).toBe(true);
  });

  test("allows open page settings when page settings are editable", () => {
    expect(
      canEditPagesPanelItemSettings({
        itemId: "page-id",
        folders,
        canManagePages: false,
        canEditPageSettings: true,
      })
    ).toBe(true);
  });
});

describe("Pages panel drag/drop helpers", () => {
  const createPages = () => {
    const pages = createDefaultPages({
      rootInstanceId: "home-root",
      homePageId: "home-page",
    });
    const rootFolder = pages.folders.get(pages.rootFolderId);
    if (rootFolder === undefined) {
      throw new Error("Expected root folder");
    }
    pages.pages.set("page-a", {
      id: "page-a",
      name: "Page A",
      path: "/page-a",
      title: JSON.stringify("Page A"),
      meta: {},
      rootInstanceId: "page-a-root",
    });
    pages.pages.set("page-b", {
      id: "page-b",
      name: "Page B",
      path: "/page-b",
      title: JSON.stringify("Page B"),
      meta: {},
      rootInstanceId: "page-b-root",
    });
    pages.folders.set("folder", {
      id: "folder",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    rootFolder.children.push("page-a", "folder", "page-b");
    return pages;
  };

  const createPageTreeItem = (): Parameters<
    typeof getPagesTreeDropTarget
  >[0]["item"] => ({
    id: "page-b",
    selector: ["page-b", "root"],
    level: 1,
    type: "page",
    page: {
      id: "page-b",
      name: "Page B",
      path: "/page-b",
      title: JSON.stringify("Page B"),
      meta: {},
      rootInstanceId: "page-b-root",
    },
    isLastChild: true,
  });

  test("resolves valid Pages panel tree drop targets", () => {
    const pages = createPages();

    expect(
      getPagesTreeDropTarget({
        item: createPageTreeItem(),
        dropTarget: { parentLevel: 0, afterLevel: 1 },
        pages,
      })
    ).toEqual({
      parentId: pages.rootFolderId,
      afterId: "page-b",
      beforeId: undefined,
      indexWithinChildren: 4,
    });

    expect(
      getPagesTreeDropTarget({
        item: createPageTreeItem(),
        dropTarget: { parentLevel: 10, afterLevel: 1 },
        pages,
      })
    ).toBeUndefined();
  });

  test("commits Pages panel tree drops through the runtime mutation bridge", () => {
    const calls: unknown[] = [];
    const executeMutation = ((input: unknown) => {
      calls.push(input);
    }) as Parameters<typeof commitPagesTreeDrop>[0]["executeMutation"];

    expect(
      commitPagesTreeDrop({
        item: createPageTreeItem(),
        dropTarget: {
          parentId: "folder",
          indexWithinChildren: 0,
        },
        executeMutation,
      })
    ).toBe(true);

    expect(calls).toEqual([
      {
        id: "pageTree.move",
        input: {
          childId: "page-b",
          parentFolderId: "folder",
          position: 0,
        },
      },
    ]);

    expect(
      commitPagesTreeDrop({
        item: createPageTreeItem(),
        dropTarget: undefined,
        executeMutation,
      })
    ).toBe(false);
    expect(calls).toHaveLength(1);
  });

  test("commits page template drops through the runtime mutation bridge", () => {
    const calls: unknown[] = [];
    const executeMutation = ((input: unknown) => {
      calls.push(input);
    }) as Parameters<typeof commitPageTemplateDrop>[0]["executeMutation"];
    const draggedTemplate = {
      id: "dragged-template",
      name: "Dragged",
      title: JSON.stringify("Dragged"),
      meta: {},
      rootInstanceId: "dragged-root",
    };
    const targetTemplate = {
      id: "target-template",
      name: "Target",
      title: JSON.stringify("Target"),
      meta: {},
      rootInstanceId: "target-root",
    };

    expect(
      commitPageTemplateDrop({
        draggedTemplate,
        targetTemplate,
        dropInfo: {
          targetId: targetTemplate.id,
          treeDropTarget: { parentLevel: 0, beforeLevel: 1 },
        },
        canManageTemplates: true,
        executeMutation,
      })
    ).toBe(true);

    expect(calls).toEqual([
      {
        id: "pageTemplates.reorder",
        input: {
          sourceTemplateId: draggedTemplate.id,
          targetTemplateId: targetTemplate.id,
          position: "before",
        },
      },
    ]);

    expect(
      commitPageTemplateDrop({
        draggedTemplate,
        targetTemplate,
        dropInfo: {
          targetId: targetTemplate.id,
          treeDropTarget: { parentLevel: 0, afterLevel: 1 },
        },
        canManageTemplates: false,
        executeMutation,
      })
    ).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
