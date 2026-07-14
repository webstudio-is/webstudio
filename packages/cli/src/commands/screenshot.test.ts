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
    fullPage: true,
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
        fullPage: true,
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
      fullPage: true,
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
      fullPage: true,
      elapsedMs: 12,
      warnings: [],
    },
    meta: { command: "screenshot" },
  });
});

test("captures a project route through a temporary production preview", async () => {
  const folder = await mkdtemp(join(tmpdir(), "webstudio-screenshot-test-"));
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const captureScreenshotWithBrowserInstall = vi.fn(async () => ({
    output: join(folder, "pricing.png"),
    browser: {
      path: "/browser",
      source: "option" as const,
      browser: "chrome" as const,
    },
    viewport: { width: 800, height: 600 },
    fullPage: false,
    elapsedMs: 12,
    warnings: [] as string[],
  }));
  const preview = {
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5180/",
      running: true,
    })),
    stop: vi.fn(async () => ({
      url: "http://127.0.0.1:5180/",
      running: false,
    })),
    resolveUrl: vi.fn(() => "http://127.0.0.1:5180/pricing"),
  };
  const preparePreviewProject = vi.fn(async () => ({
    cwd: "/tmp/preview",
    buildCacheKey: "preview-cache-key",
  }));
  const createPreviewController = vi.fn(() => preview);

  try {
    await screenshot(
      {
        path: "/pricing",
        width: 800,
        height: 600,
        json: true,
      },
      {
        captureScreenshotWithBrowserInstall,
        preparePreviewProject,
        createPreviewController,
      }
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }

  expect(preparePreviewProject).toHaveBeenCalledWith({
    assets: true,
    template: ["defaults", "react-router"],
    generate: true,
    silent: true,
  });
  expect(createPreviewController).toHaveBeenCalledWith({
    host: "127.0.0.1",
    port: 5173,
  });
  expect(preview.startAndWait).toHaveBeenCalledWith({
    cwd: "/tmp/preview",
    buildCacheKey: "preview-cache-key",
    host: "127.0.0.1",
    port: 5173,
    restart: true,
  });
  expect(preview.resolveUrl).toHaveBeenCalledWith("/pricing");
  expect(captureScreenshotWithBrowserInstall).toHaveBeenCalledWith(
    expect.objectContaining({ url: "http://127.0.0.1:5180/pricing" })
  );
  expect(preview.stop).toHaveBeenCalledOnce();
});

test("fails a generated project route that returns an HTTP error", async () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const preview = {
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: true,
    })),
    stop: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: false,
    })),
    resolveUrl: vi.fn(() => "http://127.0.0.1:5173/missing"),
  };

  await expect(
    screenshot(
      { path: "/missing", width: 800, height: 600, json: true },
      {
        captureScreenshotWithBrowserInstall: vi.fn(async () => ({
          output: "/tmp/missing.png",
          browser: {
            path: "/browser",
            source: "option" as const,
            browser: "chrome" as const,
          },
          viewport: { width: 800, height: 600 },
          fullPage: false,
          elapsedMs: 12,
          warnings: [] as string[],
          navigation: {
            requestedUrl: "http://127.0.0.1:5173/missing",
            finalUrl: "http://127.0.0.1:5173/missing",
            status: 404,
            statusText: "Not Found",
            mimeType: "text/html",
            redirects: [],
            documentReadyState: "complete",
            generatedSiteRootPresent: true,
            layoutStable: true,
          },
        })),
        preparePreviewProject: vi.fn(async () => ({ cwd: "/tmp/preview" })),
        createPreviewController: vi.fn(() => preview),
      }
    )
  ).rejects.toBeInstanceOf(HandledCliError);

  expect(JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0])).toEqual(
    expect.objectContaining({
      ok: false,
      error: {
        code: "SCREENSHOT_HTTP_ERROR",
        message: expect.stringContaining("HTTP 404"),
      },
      data: {
        output: "/tmp/missing.png",
        navigation: expect.objectContaining({ status: 404 }),
      },
    })
  );
  expect(preview.stop).toHaveBeenCalledOnce();
});

test("stops the temporary preview when project route capture fails", async () => {
  const preview = {
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: true,
    })),
    stop: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: false,
    })),
    resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
  };

  await expect(
    screenshot(
      { path: "/", width: 800, height: 600 },
      {
        captureScreenshotWithBrowserInstall: vi.fn(async () => {
          throw new Error("capture failed");
        }),
        preparePreviewProject: vi.fn(async () => ({ cwd: "/tmp/preview" })),
        createPreviewController: vi.fn(() => preview),
      }
    )
  ).rejects.toThrow("capture failed");

  expect(preview.stop).toHaveBeenCalledOnce();
});

test("stops the temporary preview when startup fails", async () => {
  const preview = {
    startAndWait: vi.fn(async () => {
      throw new Error("preview failed");
    }),
    stop: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: false,
    })),
    resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
  };

  await expect(
    screenshot(
      { path: "/", width: 800, height: 600 },
      {
        captureScreenshotWithBrowserInstall: vi.fn(),
        preparePreviewProject: vi.fn(async () => ({ cwd: "/tmp/preview" })),
        createPreviewController: vi.fn(() => preview),
      }
    )
  ).rejects.toThrow("preview failed");

  expect(preview.stop).toHaveBeenCalledOnce();
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
