import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test, vi } from "vitest";
import { screenshot } from "./screenshot";
import {
  BrowserInstallUnavailableError,
  BrowserNotFoundError,
} from "../screenshot";
import { HandledCliError } from "../errors";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints json result with a browser executable path", async () => {
  const folder = await mkdtemp(join(tmpdir(), "webstudio-screenshot-test-"));
  const browserPath = join(folder, "browser");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const captureScreenshotWithBrowserInstall = vi.fn(async () => ({
    output: join(folder, "current.png"),
    browser: {
      path: browserPath,
      source: "option" as const,
      browser: "chrome" as const,
    },
    viewport: { width: 800, height: 600 },
    elapsedMs: 12,
    warnings: [] as string[],
  }));

  try {
    await screenshot(
      {
        url: "https://example.com",
        output: join(folder, "current.png"),
        width: 800,
        height: 600,
        browser: "auto",
        browserPath,
        waitUntil: "networkidle",
        waitForSelector: "#ready",
        waitForTimeout: 500,
        timeout: 10_000,
        json: true,
      },
      { captureScreenshotWithBrowserInstall }
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }

  expect(captureScreenshotWithBrowserInstall).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "https://example.com",
      output: join(folder, "current.png"),
      width: 800,
      height: 600,
      browser: "auto",
      browserPath,
      waitUntil: "networkidle",
      waitForSelector: "#ready",
      waitForTimeout: 500,
      timeout: 10_000,
      isJson: true,
      isMcp: false,
    })
  );
  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output).toEqual({
    ok: true,
    data: {
      output: expect.stringContaining("current.png"),
      browserPath,
      browser: "chrome",
      viewport: { width: 800, height: 600 },
      elapsedMs: 12,
      warnings: [],
    },
    meta: { command: "screenshot" },
  });
});

test("rejects invalid screenshot readiness options", async () => {
  const captureScreenshotWithBrowserInstall = vi.fn();

  await expect(
    screenshot(
      {
        url: "https://example.com",
        width: 800,
        height: 600,
        waitUntil: "interactive",
      },
      { captureScreenshotWithBrowserInstall }
    )
  ).rejects.toThrow(
    "--wait-until must be commit, domcontentloaded, load, or networkidle."
  );

  await expect(
    screenshot(
      {
        url: "https://example.com",
        width: 800,
        height: 600,
        waitForTimeout: -1,
      },
      { captureScreenshotWithBrowserInstall }
    )
  ).rejects.toThrow("--wait-for-timeout must be a non-negative integer.");

  await expect(
    screenshot(
      {
        url: "https://example.com",
        width: 800,
        height: 600,
        waitForSelector: "",
      },
      { captureScreenshotWithBrowserInstall }
    )
  ).rejects.toThrow("--wait-for-selector must not be empty.");

  await expect(
    screenshot(
      {
        url: "https://example.com",
        width: 800,
        height: 600,
        timeout: 0,
      },
      { captureScreenshotWithBrowserInstall }
    )
  ).rejects.toThrow("--timeout must be a positive integer.");

  expect(captureScreenshotWithBrowserInstall).not.toHaveBeenCalled();
});

test("prints browser-not-found json error", async () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const captureScreenshotWithBrowserInstall = vi.fn(async () => {
    throw new BrowserNotFoundError(["/usr/bin/chromium"]);
  });

  await expect(
    screenshot(
      {
        url: "https://example.com",
        width: 800,
        height: 600,
        json: true,
      },
      { captureScreenshotWithBrowserInstall }
    )
  ).rejects.toBeInstanceOf(HandledCliError);

  expect(JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0])).toEqual(
    expect.objectContaining({
      ok: false,
      error: expect.objectContaining({
        code: "BROWSER_NOT_FOUND",
        message: expect.stringContaining("No supported Chromium browser"),
      }),
      meta: { command: "screenshot" },
    })
  );
});

test("prints browser-install-unavailable json error", async () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const captureScreenshotWithBrowserInstall = vi.fn(async () => {
    throw new BrowserInstallUnavailableError();
  });

  await expect(
    screenshot(
      {
        url: "https://example.com",
        width: 800,
        height: 600,
        json: true,
      },
      { captureScreenshotWithBrowserInstall }
    )
  ).rejects.toBeInstanceOf(HandledCliError);

  expect(JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0])).toEqual(
    expect.objectContaining({
      ok: false,
      error: expect.objectContaining({
        code: "BROWSER_INSTALL_UNAVAILABLE",
        message: expect.stringContaining(
          "cannot install Chromium automatically"
        ),
      }),
      meta: { command: "screenshot" },
    })
  );
});
