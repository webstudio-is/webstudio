import type { Locator, Page } from "playwright";
import { dragAndSave, dragPointer } from "./pointer-drag";

export type TreeDropPosition = "above" | "below" | "inside";

export const dragTreeRowAndSave = async ({
  page,
  sourceRow,
  targetRow,
  position,
}: {
  page: Page;
  sourceRow: Locator;
  targetRow: Locator;
  position: TreeDropPosition;
}) => {
  await dragAndSave(page, async () => {
    await dragPointer({
      page,
      source: () => sourceRow.boundingBox(),
      target: () => targetRow.boundingBox(),
      targetPoint: ({ x, y, width, height }) => ({
        x: x + width / 2,
        y:
          y +
          height *
            (position === "above" ? 0.1 : position === "below" ? 0.9 : 0.5),
      }),
      ready: async () => {
        const over =
          (await targetRow.getAttribute("data-is-drop-over")) === "true";
        if (over === false) {
          return false;
        }
        return (
          position === "inside" ||
          (await targetRow.evaluate((row) => row.children.length > 1))
        );
      },
    });
  });
};

export const getTreeRowByButton = ({ rowButton }: { rowButton: Locator }) =>
  rowButton.locator("xpath=ancestor-or-self::*[@data-tree-sortable-item][1]");
