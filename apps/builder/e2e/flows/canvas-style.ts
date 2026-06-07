import type { Page } from "playwright";
import { getCanvasFrame } from "./builder";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const waitForCanvasTextStyle = async ({
  page,
  text,
  property,
  value,
}: {
  page: Page;
  text: string;
  property: string;
  value: string;
}) => {
  const startedAt = Date.now();
  let lastValue = "";

  while (Date.now() - startedAt < 30_000) {
    const canvas = await getCanvasFrame(page);
    if (canvas === undefined) {
      await delay(250);
      continue;
    }

    const locator = canvas.getByText(text).first();
    if (
      (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) === false
    ) {
      await delay(250);
      continue;
    }

    lastValue = await locator.evaluate(
      (element, cssProperty) =>
        element.ownerDocument.defaultView
          ?.getComputedStyle(element)
          .getPropertyValue(cssProperty) ?? "",
      property
    );
    if (lastValue === value) {
      return;
    }
    await delay(250);
  }

  throw new Error(
    `Expected canvas text "${text}" to have ${property}: ${value}. Last value: ${lastValue}`
  );
};
