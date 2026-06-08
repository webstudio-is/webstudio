import type { Page } from "playwright";
import { waitForCanvasFrame } from "./builder";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const selectCanvasTextInstanceForProps = async ({
  page,
  text,
  propertyLabel,
}: {
  page: Page;
  text: string;
  propertyLabel: string;
}) => {
  const startedAt = Date.now();
  let lastBodyText = "";

  while (Date.now() - startedAt < 10_000) {
    const canvas = await waitForCanvasFrame({ page });
    await canvas.getByText(text).click();
    await delay(300);
    await page.keyboard.press("Escape");

    if (
      await page
        .getByText(propertyLabel, { exact: true })
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false)
    ) {
      return;
    }

    lastBodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    await delay(250);
  }

  throw new Error(
    `Expected selected canvas text "${text}" to show property "${propertyLabel}". Page text: ${lastBodyText}`
  );
};

export const selectCanvasTextInstance = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const startedAt = Date.now();
  let lastBodyText = "";

  while (Date.now() - startedAt < 10_000) {
    const canvas = await waitForCanvasFrame({ page });
    await canvas.getByText(text).click();
    await delay(300);

    if (
      (await page
        .getByText("No instance selected", { exact: true })
        .isVisible({ timeout: 500 })
        .catch(() => false)) === false
    ) {
      return;
    }

    lastBodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    await delay(250);
  }

  throw new Error(
    `Expected to select canvas text "${text}". Page text: ${lastBodyText}`
  );
};
