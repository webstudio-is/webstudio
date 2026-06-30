export const screenshotBrowserChoices = [
  "auto",
  "chromium",
  "chrome",
  "edge",
  "brave",
] as const;

export type ScreenshotBrowser = (typeof screenshotBrowserChoices)[number];
