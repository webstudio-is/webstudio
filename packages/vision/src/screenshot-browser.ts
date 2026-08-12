export const screenshotBrowserChoices = [
  "auto",
  "chromium",
  "chrome",
  "edge",
  "brave",
] as const;

export type ScreenshotBrowser = (typeof screenshotBrowserChoices)[number];

export const isScreenshotBrowser = (
  value: unknown
): value is ScreenshotBrowser =>
  typeof value === "string" &&
  screenshotBrowserChoices.includes(value as ScreenshotBrowser);

export const screenshotWaitUntilValues = [
  "commit",
  "domcontentloaded",
  "load",
  "networkidle",
] as const;

export type ScreenshotWaitUntil = (typeof screenshotWaitUntilValues)[number];

export const defaultScreenshotWaitUntil: ScreenshotWaitUntil = "load";

export const defaultScreenshotWaitForTimeout = 250;

export const defaultScreenshotTimeout = 30000;

export type ScreenshotCaptureOptions = {
  output?: string;
  viewport: { width: number; height: number };
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  includeContrastMetrics?: boolean;
  browser: ScreenshotBrowser;
  browserPath?: string;
  waitUntil?: ScreenshotWaitUntil;
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

export const isScreenshotWaitUntil = (
  value: unknown
): value is ScreenshotWaitUntil =>
  typeof value === "string" &&
  screenshotWaitUntilValues.includes(value as ScreenshotWaitUntil);
