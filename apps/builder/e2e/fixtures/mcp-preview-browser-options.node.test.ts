import { expect, test } from "vitest";
import { getMcpPreviewBrowserOptions } from "./mcp-preview-browser-options";

test("passes Playwright's Linux sandbox setting to the MCP browser launch", () => {
  const options = { browserPath: "/playwright/headless_shell", timeout: 3000 };
  expect(
    getMcpPreviewBrowserOptions(options, {
      platform: "linux",
      playwrightBrowserPath: options.browserPath,
    })
  ).toEqual({ ...options, disableSandbox: true });

  expect(
    getMcpPreviewBrowserOptions(options, {
      platform: "darwin",
      playwrightBrowserPath: options.browserPath,
    })
  ).toBe(options);

  expect(
    getMcpPreviewBrowserOptions(options, {
      platform: "linux",
      playwrightBrowserPath: "/different-browser",
    })
  ).toBe(options);
});
