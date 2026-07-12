import type { Page } from "playwright";
import { waitForChangeToBeSaved } from "./sync-status";

type Bounds = { x: number; y: number; width: number; height: number };

export const dragPointer = async ({
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
  source: () => Promise<Bounds | null>;
  target: () => Promise<Bounds | null>;
  targetPoint?: (bounds: Bounds) => { x: number; y: number };
  ready: () => Promise<boolean>;
  attempts?: number;
  beforeAttempt?: () => Promise<void>;
}) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await beforeAttempt?.();
    const sourceBounds = await source();
    if (sourceBounds === null) {
      throw new Error("Expected visible drag source");
    }
    const from = {
      x: sourceBounds.x + sourceBounds.width / 2,
      y: sourceBounds.y + sourceBounds.height / 2,
    };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    let accepted = false;
    try {
      await page.mouse.move(from.x + 8, from.y + 8, { steps: 4 });
      const deadline = Date.now() + 10_000;
      let jiggle = 0;
      while (Date.now() < deadline) {
        const bounds = await target();
        if (bounds === null) {
          throw new Error("Expected visible drag target");
        }
        const to = targetPoint(bounds);
        jiggle = jiggle === 0 ? 1 : 0;
        await page.mouse.move(to.x + jiggle, to.y, { steps: 3 });
        await page.waitForTimeout(120);
        const after = await target();
        if (
          after !== null &&
          after.y === bounds.y &&
          after.height === bounds.height &&
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

export const dragAndSave = async (page: Page, drag: () => Promise<void>) => {
  const saved = waitForChangeToBeSaved({ page, timeout: 30_000 });
  try {
    await drag();
  } catch (error) {
    await saved.catch(() => undefined);
    throw error;
  }
  await saved;
};
