import type { Frame, Page } from "playwright";
import { getProjectBuilderUrl } from "../harness";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const builderNetworkIdleTimeout =
  Number.parseInt(process.env.E2E_BUILDER_NETWORK_IDLE_TIMEOUT_MS ?? "", 10) ||
  5_000;

export const getCanvasInstanceSelector = (instanceSelector: string[]) =>
  `[data-ws-selector="${instanceSelector.join(",")}"]`;

export const getCanvasInstance = ({
  canvas,
  instanceSelector,
}: {
  canvas: Frame;
  instanceSelector: string[];
}) => canvas.locator(getCanvasInstanceSelector(instanceSelector)).first();

export const getCanvasFrame = async (page: Page) => {
  const iframe = await page.locator("iframe").first().elementHandle();
  return (await iframe?.contentFrame()) ?? undefined;
};

export const waitForCanvasFrame = async ({ page }: { page: Page }) => {
  try {
    await page.locator("iframe").first().waitFor({
      state: "attached",
      timeout: 30_000,
    });
  } catch (error) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    throw new Error(`Expected canvas iframe. Body: ${bodyText}`, {
      cause: error,
    });
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    const canvas = await getCanvasFrame(page);
    if (canvas !== undefined) {
      return canvas;
    }
    await delay(250);
  }

  throw new Error("Expected canvas frame");
};

export const waitForCanvasText = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < 30_000) {
    const canvas = await getCanvasFrame(page);
    if (canvas === undefined) {
      await delay(250);
      continue;
    }

    try {
      await canvas.getByText(text).waitFor({
        state: "visible",
        timeout: 1_000,
      });
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  const canvas = await getCanvasFrame(page);
  const frameText = await canvas
    ?.locator("body")
    .innerText()
    .catch(() => "");
  const frameHtml = await canvas
    ?.locator("body")
    .innerHTML()
    .catch(() => "");
  throw new Error(
    `Expected canvas text "${text}". Frame text: ${frameText}. Frame HTML: ${frameHtml}`,
    { cause: lastError }
  );
};

export const waitForCanvasTextHidden = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const canvas = await waitForCanvasFrame({ page });
  await canvas.getByText(text, { exact: true }).first().waitFor({
    state: "hidden",
    timeout: 30_000,
  });
};

export const dismissBlockingAlerts = async ({ page }: { page: Page }) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 3_000) {
    const dismissButton = page.getByRole("button", { name: "Dismiss" });
    if (await dismissButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await dismissButton.click();
      return;
    }
    await delay(100);
  }
};

export const openProjectBuilder = async ({
  page,
  projectId,
  authToken,
  mode,
  features,
}: {
  page: Page;
  projectId: string;
  authToken?: string;
  mode?: "content" | "preview";
  features?: string[];
}): Promise<Frame> => {
  await page.goto(
    getProjectBuilderUrl({ projectId, authToken, mode, features })
  );
  await page
    .waitForLoadState("networkidle", { timeout: builderNetworkIdleTimeout })
    .catch(() => undefined);
  const canvas = await waitForCanvasFrame({ page });
  await dismissBlockingAlerts({ page });
  return canvas;
};

export const openBuilderUrl = async ({
  page,
  url,
}: {
  page: Page;
  url: string;
}): Promise<Frame> => {
  await page.goto(url);
  await page
    .waitForLoadState("networkidle", { timeout: builderNetworkIdleTimeout })
    .catch(() => undefined);
  const canvas = await waitForCanvasFrame({ page });
  await dismissBlockingAlerts({ page });
  return canvas;
};
