export const getMcpPreviewBrowserOptions = <
  Options extends { browserPath: string },
>(
  options: Options,
  {
    platform = process.platform,
    playwrightBrowserPath = process.env.WEBSTUDIO_BROWSER_PATH,
  } = {}
) => {
  if (platform === "linux" && options.browserPath === playwrightBrowserPath) {
    // Match Playwright's sandbox setting for its Chromium binary on Linux.
    return { ...options, disableSandbox: true };
  }
  return options;
};
