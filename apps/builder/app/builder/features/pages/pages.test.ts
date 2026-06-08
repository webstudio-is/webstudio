import { describe, expect, test } from "vitest";
import { __testing__ } from "./pages";

const { canEditPagesPanelItemSettings, canEditPagesTreeItemSettings } =
  __testing__;

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
