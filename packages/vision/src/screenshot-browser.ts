export const screenshotBrowserChoices = [
  "auto",
  "chromium",
  "chrome",
  "edge",
  "brave",
] as const;

export type ScreenshotBrowser = (typeof screenshotBrowserChoices)[number];

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

export const isScreenshotWaitUntil = (
  value: unknown
): value is ScreenshotWaitUntil =>
  typeof value === "string" &&
  screenshotWaitUntilValues.includes(value as ScreenshotWaitUntil);
