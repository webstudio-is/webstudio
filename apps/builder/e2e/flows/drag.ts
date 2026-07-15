import type { Frame, Locator, Page } from "playwright";
import { waitForChangeToBeSaved } from "./sync-status";

type Bounds = { x: number; y: number; width: number; height: number };

const dragPointer = async ({
  page,
  source,
  target,
  targetPoint = ({ x, y, width, height }: Bounds) => ({
    x: x + width / 2,
    y: y + height / 2,
  }),
  ready,
  attempts = 1,
  beforeAttempt,
}: {
  page: Page;
  source: Locator;
  target: Locator;
  targetPoint?: (bounds: Bounds) => { x: number; y: number };
  ready: () => Promise<boolean>;
  attempts?: number;
  beforeAttempt?: () => Promise<void>;
}) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await beforeAttempt?.();
    const bounds = await source.boundingBox();
    if (bounds === null) {
      throw new Error("Expected visible drag source");
    }
    const from = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    let accepted = false;
    try {
      await page.mouse.move(from.x + 8, from.y + 8, { steps: 4 });
      const deadline = Date.now() + 10_000;
      let jiggle = 0;
      while (Date.now() < deadline) {
        const before = await target.boundingBox();
        if (before === null) {
          throw new Error("Expected visible drag target");
        }
        const to = targetPoint(before);
        jiggle = jiggle === 0 ? 1 : 0;
        await page.mouse.move(to.x + jiggle, to.y, { steps: 3 });
        await page.waitForTimeout(120);
        const after = await target.boundingBox();
        if (
          after?.y === before.y &&
          after.height === before.height &&
          (await ready())
        ) {
          accepted = true;
          break;
        }
      }
    } finally {
      await page.mouse.up();
    }
    if (accepted) {
      return;
    }
  }
  throw new Error("Drag target did not accept the pointer gesture");
};

const dragAndSave = async (page: Page, drag: () => Promise<void>) => {
  await Promise.all([
    waitForChangeToBeSaved({ page, timeout: 30_000 }),
    drag(),
  ]);
};

export const getTreeRowByButton = (rowButton: Locator) =>
  rowButton.locator("xpath=ancestor-or-self::*[@data-tree-sortable-item][1]");

export const dragTreeRow = async (
  page: Page,
  source: Locator,
  target: Locator,
  position: "above" | "inside"
) => {
  await dragAndSave(page, () =>
    dragPointer({
      page,
      source,
      target,
      targetPoint: ({ x, y, width, height }) => ({
        x: x + width / 2,
        y: y + height * (position === "above" ? 0.1 : 0.5),
      }),
      ready: async () =>
        (await target.getAttribute("data-is-drop-over")) === "true" &&
        (position === "inside" ||
          (await target.evaluate((row) => row.children.length > 1))),
    })
  );
};

const waitForCanvas = (canvas: Frame) =>
  canvas.locator("body:not([inert])").waitFor();

export const ensureInteractiveCanvas = async (
  page: Page,
  canvas: Frame,
  target: Locator
) => {
  await waitForCanvas(canvas);
  await target.click();
  await page.locator("[data-ws-outline]").first().waitFor();
};

export const dragToCanvas = async (
  page: Page,
  canvas: Frame,
  source: Locator,
  target: Locator
) => {
  await dragAndSave(page, () =>
    dragPointer({
      page,
      source,
      target,
      ready: () =>
        page
          .locator("[data-placement-indicator]")
          .first()
          .isVisible()
          .catch(() => false),
      attempts: 3,
      beforeAttempt: () => waitForCanvas(canvas),
    })
  );
};
