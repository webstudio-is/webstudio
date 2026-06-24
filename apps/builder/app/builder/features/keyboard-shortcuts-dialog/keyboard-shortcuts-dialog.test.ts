import { describe, expect, test } from "vitest";
import { __testing__ } from "./keyboard-shortcuts-dialog";

const { additionalShortcuts, getShortcutCategoryColumns } = __testing__;

describe("keyboard shortcuts dialog", () => {
  test("keeps semantic category groups in expected columns", () => {
    const { leftCategories, rightCategories } = getShortcutCategoryColumns([
      "General",
      "Top bar",
      "Navigator",
      "Panels",
      "Style panel",
    ]);

    expect(leftCategories).toEqual([
      "General",
      "Top bar",
      "Panels",
      "Style panel",
    ]);
    expect(rightCategories).toEqual(["Navigator"]);
  });

  test("lists navigator multi-selection shortcuts", () => {
    expect(additionalShortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "toggleNavigatorSelection",
          defaultHotkeys: ["meta+click", "ctrl+click"],
        }),
        expect.objectContaining({
          name: "rangeNavigatorSelection",
          defaultHotkeys: ["shift+click"],
        }),
        expect.objectContaining({
          name: "extendNavigatorSelectionUp",
          defaultHotkeys: ["shift+arrowup"],
        }),
        expect.objectContaining({
          name: "extendNavigatorSelectionDown",
          defaultHotkeys: ["shift+arrowdown"],
        }),
        expect.objectContaining({
          name: "selectNavigatorSiblings",
          defaultHotkeys: ["meta+a", "ctrl+a"],
        }),
      ])
    );
  });
});
