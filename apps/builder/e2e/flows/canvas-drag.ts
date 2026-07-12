import type { Frame, Locator, Page } from "playwright";
import { dragAndSave, dragPointer } from "./pointer-drag";

const waitForInteractiveCanvas = async (canvas: Frame) => {
  await canvas.locator("body:not([inert])").waitFor();
};

export const ensureInteractiveCanvas = async ({
  page,
  canvas,
  probeSelector,
}: {
  page: Page;
  canvas: Frame;
  probeSelector: string;
}) => {
  await waitForInteractiveCanvas(canvas);
  await canvas.locator(probeSelector).first().click();
  await page.locator("[data-ws-outline]").first().waitFor();
};

const dragToCanvasAndSave = async ({
  page,
  canvas,
  source,
  targetSelector,
}: {
  page: Page;
  canvas: Frame;
  source: Locator;
  targetSelector: string;
}) => {
  const target = canvas.locator(targetSelector).first();
  await dragAndSave(page, async () => {
    await dragPointer({
      page,
      source: () => source.boundingBox(),
      target: () => target.boundingBox(),
      ready: () =>
        page
          .locator("[data-placement-indicator]")
          .first()
          .isVisible()
          .catch(() => false),
      attempts: 3,
      beforeAttempt: () => waitForInteractiveCanvas(canvas),
    });
  });
};

export const dragCanvasInstanceToInstance = async ({
  page,
  canvas,
  sourceSelector,
  targetSelector,
}: {
  page: Page;
  canvas: Frame;
  sourceSelector: string;
  targetSelector: string;
}) => {
  await ensureInteractiveCanvas({
    page,
    canvas,
    probeSelector: targetSelector,
  });
  await dragToCanvasAndSave({
    page,
    canvas,
    source: canvas.locator(sourceSelector).first(),
    targetSelector,
  });
};

export const dragComponentCardToCanvas = async ({
  page,
  canvas,
  card,
  targetSelector,
}: {
  page: Page;
  canvas: Frame;
  card: Locator;
  targetSelector: string;
}) => dragToCanvasAndSave({ page, canvas, source: card, targetSelector });
