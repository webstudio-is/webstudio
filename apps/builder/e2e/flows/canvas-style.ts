import type { Page } from "playwright";
import { getCanvasFrame } from "./builder";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getVisibleCanvasTextStyleValues = async ({
  page,
  text,
  property,
}: {
  page: Page;
  text: string;
  property: string;
}) => {
  const canvas = await getCanvasFrame(page);
  if (canvas === undefined) {
    return;
  }

  const locator = canvas.getByText(text);
  const total = await locator.count();
  const values = [];
  for (let index = 0; index < total; index += 1) {
    const item = locator.nth(index);
    if (
      (await item.isVisible({ timeout: 1_000 }).catch(() => false)) === false
    ) {
      continue;
    }
    values.push(
      await item.evaluate(
        (element, cssProperty) =>
          element.ownerDocument.defaultView
            ?.getComputedStyle(element)
            .getPropertyValue(cssProperty) ?? "",
        property
      )
    );
  }
  return values;
};

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
    await page.mouse.move(0, 0).catch(() => undefined);
    const values = await getVisibleCanvasTextStyleValues({
      page,
      text,
      property,
    });
    if (values === undefined) {
      await delay(250);
      continue;
    }

    lastValue = values[0] ?? "";
    if (lastValue === value) {
      return;
    }
    await delay(250);
  }

  throw new Error(
    `Expected canvas text "${text}" to have ${property}: ${value}. Last value: ${lastValue}`
  );
};

export const waitForHoveredCanvasTextStyle = async ({
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
    await locator.hover().catch(() => undefined);
    lastValue = await locator
      .evaluate(
        (element, cssProperty) =>
          element.ownerDocument.defaultView
            ?.getComputedStyle(element)
            .getPropertyValue(cssProperty) ?? "",
        property
      )
      .catch(() => "");
    if (lastValue === value) {
      return;
    }
    await delay(250);
  }

  throw new Error(
    `Expected hovered canvas text "${text}" to have ${property}: ${value}. Last value: ${lastValue}`
  );
};

export const waitForCanvasTextStyleCount = async ({
  page,
  text,
  property,
  value,
  count,
}: {
  page: Page;
  text: string;
  property: string;
  value: string;
  count: number;
}) => {
  const startedAt = Date.now();
  let lastValues: string[] = [];

  while (Date.now() - startedAt < 30_000) {
    const values = await getVisibleCanvasTextStyleValues({
      page,
      text,
      property,
    });
    if (values === undefined) {
      await delay(250);
      continue;
    }

    lastValues = values;

    if (lastValues.filter((item) => item === value).length === count) {
      return;
    }
    await delay(250);
  }

  throw new Error(
    `Expected ${count} visible canvas texts "${text}" to have ${property}: ${value}. Last values: ${lastValues.join(", ")}`
  );
};
