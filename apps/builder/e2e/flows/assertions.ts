import type { Locator, Page } from "playwright";

export const expectLocatorHidden = async ({
  locator,
  message,
}: {
  locator: Locator;
  message: string;
}) => {
  if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
    throw new Error(message);
  }
};

export const expectTextHidden = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  await expectLocatorHidden({
    locator: page.getByText(text, { exact: true }).first(),
    message: `Expected text "${text}" to be hidden`,
  });
};
