import type { Page } from "playwright";
import { waitForCanvasFrame } from "./builder";

export const waitForCanvasImage = async ({
  page,
  alt,
}: {
  page: Page;
  alt: string;
}) => {
  const canvas = await waitForCanvasFrame({ page });
  await canvas.getByRole("img", { name: alt }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

export const waitForCanvasVideoSource = async ({
  page,
  sourceName,
}: {
  page: Page;
  sourceName: string;
}) => {
  const canvas = await waitForCanvasFrame({ page });
  await canvas.locator(`video[src*="${sourceName}"]`).waitFor({
    state: "visible",
    timeout: 10_000,
  });
};
