import type { Locator, Page } from "playwright";
import { getCanvasFrame, waitForCanvasText } from "./builder";
import { waitForChangeToBeSaved } from "./sync-status";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const startCanvasTextEditing = async ({
  target,
  editable,
}: {
  target: Locator;
  editable: Locator;
}) => {
  await target.click();
  if (await editable.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await target.click();
  await target.press("Enter");
  if (await editable.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await target.dblclick();
  await editable.waitFor({ state: "visible", timeout: 2_000 });
};

export const replaceCanvasText = async ({
  page,
  currentText,
  text,
}: {
  page: Page;
  currentText: string;
  text: string;
}) => {
  const startedAt = Date.now();
  let lastError: unknown;
  let frameHtml = "";
  let edited = false;

  while (Date.now() - startedAt < 10_000) {
    const canvas = await getCanvasFrame(page);
    if (canvas === undefined) {
      await delay(250);
      continue;
    }

    try {
      const target = canvas.getByText(currentText);
      await target.waitFor({ state: "visible", timeout: 1_000 });

      const editable = canvas.locator("[contenteditable]");

      await startCanvasTextEditing({ target, editable });
      await editable.click();
      await page.keyboard.press("ControlOrMeta+A");

      const save = waitForChangeToBeSaved({ page });
      try {
        await page.keyboard.type(text);
        await canvas.locator("body").click({ position: { x: 1, y: 1 } });
        await editable.waitFor({ state: "hidden", timeout: 1_000 });
        await waitForCanvasText({ page, text });
        await save;
      } catch (error) {
        await save.catch(() => undefined);
        throw error;
      }
      frameHtml = await canvas
        .locator("body")
        .innerHTML()
        .catch(() => "");
      edited = true;
      break;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  if (frameHtml === "") {
    const canvas = await getCanvasFrame(page);
    frameHtml =
      (await canvas
        ?.locator("body")
        .innerHTML()
        .catch(() => "")) ?? "";
  }

  if (edited) {
    return;
  }

  throw new Error(
    `Expected to edit canvas text "${currentText}". Frame HTML: ${frameHtml}`,
    { cause: lastError }
  );
};
