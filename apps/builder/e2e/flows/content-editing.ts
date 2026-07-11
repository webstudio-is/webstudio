import type { Locator, Page } from "playwright";
import {
  getCanvasFrame,
  waitForCanvasFrame,
  waitForCanvasText,
} from "./builder";
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

const startCanvasTextEditingByText = async ({
  page,
  currentText,
}: {
  page: Page;
  currentText: string;
}) => {
  await waitForContentEditMode({ page });

  const startedAt = Date.now();
  let lastError: unknown;
  let frameHtml = "";

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
      frameHtml = await canvas
        .locator("body")
        .innerHTML()
        .catch(() => "");
      return { canvas, editable };
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

  throw new Error(
    `Expected to edit canvas text "${currentText}". Frame HTML: ${frameHtml}`,
    { cause: lastError }
  );
};

export const waitForContentEditMode = async ({ page }: { page: Page }) => {
  const canvas = await waitForCanvasFrame({ page });
  await canvas
    .locator("body[data-ws-content-edit-mode='ready']")
    .waitFor({ state: "visible", timeout: 10_000 });
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
  const { canvas, editable } = await startCanvasTextEditingByText({
    page,
    currentText,
  });
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
};

export const pasteCanvasText = async ({
  page,
  currentText,
  text,
}: {
  page: Page;
  currentText: string;
  text: string;
}) => {
  const { canvas, editable } = await startCanvasTextEditingByText({
    page,
    currentText,
  });
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, text);
  await page.keyboard.press("ControlOrMeta+A");
  const save = waitForChangeToBeSaved({ page });
  try {
    await page.keyboard.press("ControlOrMeta+V");
    await canvas.locator("body").click({ position: { x: 1, y: 1 } });
    await editable.waitFor({ state: "hidden", timeout: 1_000 });
    await waitForCanvasText({ page, text });
    await save;
  } catch (error) {
    await save.catch(() => undefined);
    throw error;
  }
};

export const replaceCanvasTextAndApplyInlineFormats = async ({
  page,
  currentText,
  text,
  formats,
}: {
  page: Page;
  currentText: string;
  text: string;
  formats: Array<"Bold" | "Italic" | "Inline link" | "Wrap with span">;
}) => {
  const { canvas, editable } = await startCanvasTextEditingByText({
    page,
    currentText,
  });

  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(text);
  await page.keyboard.press("ControlOrMeta+A");

  for (const format of formats) {
    await page.getByRole("button", { name: format, exact: true }).click();
  }

  const save = waitForChangeToBeSaved({ page });
  try {
    await canvas.locator("body").click({ position: { x: 1, y: 1 } });
    await editable.waitFor({ state: "hidden", timeout: 1_000 });
    await waitForCanvasText({ page, text });
    await save;
  } catch (error) {
    await save.catch(() => undefined);
    throw error;
  }
};

export const removeCanvasInlineLink = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const { canvas, editable } = await startCanvasTextEditingByText({
    page,
    currentText: text,
  });

  await page.keyboard.press("ControlOrMeta+A");
  await page.getByRole("button", { name: "Inline link", exact: true }).click();

  const save = waitForChangeToBeSaved({ page });
  try {
    await canvas.locator("body").click({ position: { x: 1, y: 1 } });
    await editable.waitFor({ state: "hidden", timeout: 1_000 });
    await waitForCanvasText({ page, text });
    await save;
  } catch (error) {
    await save.catch(() => undefined);
    throw error;
  }
};
