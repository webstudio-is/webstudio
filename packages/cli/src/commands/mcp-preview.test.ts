import { expect, test, vi } from "vitest";
import {
  BrowserSessionClosedError,
  BrowserStartupError,
} from "@webstudio-is/vision/browser";
import {
  createScreenshotCaptureSession,
  defaultScreenshotDependencies,
  type ScreenshotDependencies,
} from "../screenshot";
import {
  createMcpPreviewHandlers,
  createPreviewFreshness,
  resolveMcpPreviewInput,
  resolveMcpScreenshotInput,
  startMcpPreview,
} from "./mcp-preview";

test("allocates an available port only when MCP preview omits one", async () => {
  const getAvailablePort = vi.fn(async () => 53124);

  await expect(
    resolveMcpPreviewInput({ source: "session" }, getAvailablePort)
  ).resolves.toEqual({ source: "session", port: 53124 });
  await expect(
    resolveMcpPreviewInput({ source: "session", port: 0 }, getAvailablePort)
  ).resolves.toEqual({ source: "session", port: 53124 });
  await expect(
    resolveMcpPreviewInput({ source: "session", port: 4173 }, getAvailablePort)
  ).resolves.toEqual({ source: "session", port: 4173 });
  expect(getAvailablePort).toHaveBeenCalledTimes(2);
  expect(getAvailablePort).toHaveBeenNthCalledWith(1, "127.0.0.1");
  expect(getAvailablePort).toHaveBeenNthCalledWith(2, "127.0.0.1");
});

test("allocates and reuses a collision-free port for automatic screenshots", async () => {
  const getAvailablePort = vi.fn(async () => 53124);

  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        browser: "auto",
        viewport: { width: 390, height: 844 },
      },
      { running: false, url: "http://127.0.0.1:5173/" },
      { getAvailablePort }
    )
  ).resolves.toMatchObject({ port: 53124 });
  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        browser: "auto",
        viewport: { width: 1440, height: 900 },
      },
      { running: true, url: "http://127.0.0.1:53125/" },
      { getAvailablePort }
    )
  ).resolves.toMatchObject({ port: 53125 });
  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        browser: "auto",
        port: 4173,
        viewport: { width: 1440, height: 900 },
      },
      { running: false, url: "http://127.0.0.1:5173/" },
      { getAvailablePort }
    )
  ).resolves.toMatchObject({ port: 4173 });
  expect(getAvailablePort).toHaveBeenCalledOnce();
});

test("allocates an available port for a local-source screenshot", async () => {
  const getAvailablePort = vi.fn(async () => 53124);

  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        source: "local",
        viewport: { width: 1440, height: 900 },
      },
      { running: false },
      { getAvailablePort }
    )
  ).resolves.toMatchObject({ source: "local", port: 53124 });
  expect(getAvailablePort).toHaveBeenCalledWith("127.0.0.1");
});

test("rejects an occupied explicit screenshot port before preview preparation", async () => {
  const isPortAvailable = vi.fn(async () => false);

  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        port: 5199,
        viewport: { width: 1440, height: 900 },
      },
      { running: false },
      {
        getAvailablePort: vi.fn(async () => 53124),
        isPortAvailable,
      }
    )
  ).rejects.toMatchObject({
    code: "PREVIEW_PORT_IN_USE",
    message: expect.stringContaining(
      "Pass baseUrl with path to capture that existing site"
    ),
  });
  expect(isPortAvailable).toHaveBeenCalledWith("127.0.0.1", 5199);
});

test("reuses an owned explicit screenshot port when host is omitted", async () => {
  const isPortAvailable = vi.fn(async () => false);

  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        port: 5199,
        viewport: { width: 1440, height: 900 },
      },
      { running: true, url: "http://localhost:5199/" },
      {
        getAvailablePort: vi.fn(async () => 53124),
        isPortAvailable,
      }
    )
  ).resolves.toMatchObject({ port: 5199 });
  expect(isPortAvailable).not.toHaveBeenCalled();
});

test("reuses an owned preview on the default HTTP port", async () => {
  const isPortAvailable = vi.fn(async () => false);

  await expect(
    resolveMcpScreenshotInput(
      {
        path: "/account",
        port: 80,
        viewport: { width: 1440, height: 900 },
      },
      { running: true, url: "http://localhost/" },
      {
        getAvailablePort: vi.fn(async () => 53124),
        isPortAvailable,
      }
    )
  ).resolves.toMatchObject({ port: 80 });
  expect(isPortAvailable).not.toHaveBeenCalled();
});

test("retries automatic MCP preview ports after a startup race", async () => {
  const getAvailablePort = vi
    .fn()
    .mockResolvedValueOnce(53124)
    .mockResolvedValueOnce(53125);
  const startPreview = vi
    .fn()
    .mockRejectedValueOnce(new Error("Preview server exited before ready"))
    .mockResolvedValueOnce({ url: "http://127.0.0.1:53125/" });
  const sleep = vi.fn(async () => undefined);

  await expect(
    startMcpPreview({
      input: { source: "session" },
      getAvailablePort,
      startPreview,
      sleep,
    })
  ).resolves.toEqual({ url: "http://127.0.0.1:53125/" });
  expect(startPreview).toHaveBeenNthCalledWith(1, {
    source: "session",
    port: 53124,
  });
  expect(startPreview).toHaveBeenNthCalledWith(2, {
    source: "session",
    port: 53125,
  });
  expect(sleep).toHaveBeenCalledWith(500);
});

test("does not mark a preview fresh after a newer mutation", () => {
  const freshness = createPreviewFreshness();
  const capturedRevision = freshness.capture();

  freshness.markStale();
  freshness.markFresh(capturedRevision);

  expect(freshness.isStale()).toBe(true);
  const currentRevision = freshness.capture();
  freshness.markFresh(currentRevision);
  expect(freshness.isStale()).toBe(false);
});

test("reports stale state and the last rendered project version", () => {
  const freshness = createPreviewFreshness();

  expect(freshness.status()).toEqual({ stale: true });
  freshness.markFresh(freshness.capture(), 7);
  expect(freshness.status()).toEqual({
    stale: false,
    renderedProjectVersion: 7,
  });
  freshness.markStale();
  expect(freshness.status()).toEqual({
    stale: true,
    renderedProjectVersion: 7,
  });
});

test("coalesces overlapping refreshes of the same stale preview", async () => {
  const freshness = createPreviewFreshness();
  let releasePreparation: () => void = () => undefined;
  const preparationBlocked = new Promise<void>((resolve) => {
    releasePreparation = resolve;
  });
  const preparePreview = vi.fn(async () => {
    await preparationBlocked;
    return { cwd: "/tmp/preview" };
  });
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    canReuse: vi.fn(() => true),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:5173${path}`),
  };
  const captureScreenshot = createCaptureScreenshotMock([]);
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: freshness.isStale,
    captureFreshness: freshness.capture,
    markFresh: freshness.markFresh,
    preparePreview,
    captureScreenshot,
  });

  const firstCapture = handlers.captureScreenshot({
    path: "/first",
    viewport: { width: 1280, height: 720 },
  });
  const secondCapture = handlers.captureScreenshot({
    path: "/second",
    viewport: { width: 1280, height: 720 },
  });
  await vi.waitFor(() => expect(preparePreview).toHaveBeenCalledOnce());
  releasePreparation();
  await Promise.all([firstCapture, secondCapture]);

  expect(preparePreview).toHaveBeenCalledOnce();
  expect(preview.startAndWait).toHaveBeenCalledOnce();
  expect(captureScreenshot).toHaveBeenCalledTimes(2);
});

const createCaptureScreenshotMock = (events: string[]) =>
  vi.fn(async (options) => {
    events.push(`capture:${options.url}`);
    return {
      output: "screenshot.png",
      browser: {
        browser: "chromium" as const,
        path: "/browser",
        source: "path" as const,
      },
      viewport: { width: options.width, height: options.height },
      fullPage: options.fullPage === true,
      elapsedMs: 1,
      warnings: [],
      layout: {
        viewportWidth: options.width,
        viewportHeight: options.height,
        contentWidth: options.width + 20,
        contentHeight: options.height * 2,
        horizontalOverflow: true,
        images: [],
        resources: [],
      },
    };
  });

test("captures stale path screenshots through the restarted preview server", async () => {
  const events: string[] = [];
  const prepareSessionDataFile = vi.fn(async () => {
    events.push("session");
  });
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(async (options) => {
      events.push(`start:${options.cwd}:${options.restart}`);
      return {
        url: "http://127.0.0.1:3000/",
        running: true,
        mode: "iterative" as const,
      };
    }),
    resolveUrl: vi.fn((path: string) => {
      events.push(`resolve:${path}`);
      return `http://127.0.0.1:3000${path}`;
    }),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);
  const progress: string[] = [];

  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => true,
    preparePreview: async () => {
      events.push("prepare");
      return { cwd: "/tmp/generated-preview" };
    },
    prepareSessionDataFile,
    captureScreenshot,
  });

  await expect(
    handlers.captureScreenshot(
      {
        path: "/pricing",
        source: "session",
        viewport: { width: 1440, height: 900 },
      },
      {
        report: (message) => {
          progress.push(message);
        },
      }
    )
  ).resolves.toMatchObject({
    output: "screenshot.png",
    layout: {
      viewportWidth: 1440,
      contentWidth: 1460,
      horizontalOverflow: true,
      images: [],
      resources: [],
    },
  });

  expect(captureScreenshot).toHaveBeenCalledWith(
    expect.objectContaining({
      browser: "auto",
      url: "http://127.0.0.1:3000/pricing",
    })
  );
  expect(events).toEqual([
    "prepare",
    "start:/tmp/generated-preview:true",
    "resolve:/pricing",
    "capture:http://127.0.0.1:3000/pricing",
  ]);
  expect(prepareSessionDataFile).not.toHaveBeenCalled();
  expect(progress).toEqual([
    "tool screenshot preparing generated preview project",
    "tool screenshot starting iterative preview server",
    "tool screenshot capturing http://127.0.0.1:3000/pricing",
  ]);
});

test("passes explicit preview source to preview preparation", async () => {
  const events: string[] = [];
  let projectVersion = 1;
  const preview = {
    status: vi.fn(() => ({
      url: "",
      running: false,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(async (options) => {
      events.push(`start:${options.cwd}:${options.restart}`);
      return {
        url: "http://127.0.0.1:3000/",
        running: true,
        mode: "iterative" as const,
      };
    }),
    resolveUrl: vi.fn(),
  };
  const prepareSessionDataFile = vi.fn(async () => {
    projectVersion = 2;
  });
  const preparePreview = vi.fn(async (source, prepareSessionDataFile) => {
    events.push(`prepare:${source}`);
    await prepareSessionDataFile?.();
    return { cwd: "/tmp/generated-preview" };
  });
  const progress: string[] = [];
  const markFresh = vi.fn();

  const handlers = createMcpPreviewHandlers({
    preview,
    preparePreview,
    prepareSessionDataFile,
    getProjectVersion: () => projectVersion,
    markFresh,
  });

  await handlers.startPreview(
    { source: "session" },
    {
      report: (message) => {
        progress.push(message);
      },
    }
  );

  expect(preparePreview).toHaveBeenCalledWith(
    "session",
    prepareSessionDataFile,
    {
      preserveGeneratedProject: false,
      prepareForIncrementalGeneration: true,
      reportProgress: expect.any(Function),
    }
  );
  expect(prepareSessionDataFile).toHaveBeenCalledOnce();
  expect(markFresh).toHaveBeenCalledWith(expect.any(Number), 2);
  expect(events).toEqual([
    "prepare:session",
    "start:/tmp/generated-preview:true",
  ]);
  expect(progress).toEqual([
    "tool preview.start preparing generated preview project",
    "tool preview.start starting iterative preview server",
  ]);
});

test("restarts a stale iterative preview for external clients", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    canReuse: vi.fn(() => true),
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    resolveUrl: vi.fn(),
  };
  const preparePreview = vi.fn(async () => ({
    cwd: "/tmp/generated-preview",
    buildCacheKey: "version-2",
  }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => true,
    preparePreview,
  });

  await handlers.startPreview({ mode: "iterative" });

  expect(preparePreview).toHaveBeenCalledWith("session", undefined, {
    preserveGeneratedProject: true,
    prepareForIncrementalGeneration: true,
  });
  expect(preview.startAndWait).toHaveBeenCalledWith(
    expect.objectContaining({
      cwd: "/tmp/generated-preview",
      buildCacheKey: "version-2",
      restart: true,
    })
  );
});

test("rejects invalid external image domains before preparing preview", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "",
      running: false,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn(),
  };
  const preparePreview = vi.fn();
  const handlers = createMcpPreviewHandlers({ preview, preparePreview });

  await expect(
    handlers.startPreview({
      imageDomains: ["https://images.example.com/path"],
    })
  ).rejects.toThrow(
    "Image domains must be hostnames without a protocol or path"
  );
  await expect(
    handlers.captureScreenshot({
      path: "/",
      imageDomains: ["https://images.example.com/path"],
      viewport: { width: 1440, height: 900 },
    })
  ).rejects.toThrow(
    "Image domains must be hostnames without a protocol or path"
  );

  expect(preparePreview).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
});

test("captures fresh path screenshots through the running preview server", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => {
      events.push(`resolve:${path}`);
      return `http://127.0.0.1:3000${path}`;
    }),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);
  const progress: string[] = [];

  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview: async () => {
      events.push("prepare");
      return { cwd: "/tmp/generated-preview" };
    },
    captureScreenshot,
  });

  const result = await handlers.captureScreenshot(
    {
      path: "/about",
      viewport: { width: 1440, height: 900 },
      fullPage: true,
    },
    {
      report: (message) => {
        progress.push(message);
      },
    }
  );

  expect(preview.startAndWait).not.toHaveBeenCalled();
  expect(events).toEqual([
    "resolve:/about",
    "capture:http://127.0.0.1:3000/about",
  ]);
  expect(captureScreenshot).toHaveBeenCalledWith(
    expect.objectContaining({
      fullPage: true,
    })
  );
  expect(result.previewMode).toBe("iterative");
  expect(progress).toEqual([
    "tool screenshot capturing http://127.0.0.1:3000/about",
  ]);
});

test("does not regenerate for repeated explicit options that match preview", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    canReuse: vi.fn(() => true),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:5173${path}`),
  };
  const preparePreview = vi.fn();
  const captureScreenshot = createCaptureScreenshotMock([]);
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview,
    captureScreenshot,
  });

  await handlers.captureScreenshot({
    path: "/about",
    host: "127.0.0.1",
    port: 5173,
    imageDomains: ["images.example.com"],
    viewport: { width: 1440, height: 900 },
  });

  expect(preview.canReuse).toHaveBeenCalledWith({
    host: "127.0.0.1",
    port: 5173,
    imageDomains: ["images.example.com"],
    mode: "iterative",
  });
  expect(preparePreview).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
  expect(captureScreenshot).toHaveBeenCalledOnce();
});

test("reuses and closes one browser capture session for session screenshots", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
    stop: vi.fn(async () => ({
      url: "",
      running: false,
      mode: "iterative" as const,
    })),
  };
  const capture = createCaptureScreenshotMock([]);
  const close = vi.fn(async () => undefined);
  const capturePage = vi.fn(async () => []);
  const createCaptureSession = vi.fn(() => ({ capture, capturePage, close }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  await handlers.captureScreenshot({
    path: "/one",
    source: "session",
    viewport: { width: 1440, height: 900 },
  });
  await handlers.captureScreenshot({
    path: "/two",
    source: "session",
    viewport: { width: 390, height: 844 },
  });

  expect(createCaptureSession).toHaveBeenCalledOnce();
  expect(capture).toHaveBeenCalledTimes(2);
  expect(close).not.toHaveBeenCalled();

  await handlers.stopPreview();

  expect(close).toHaveBeenCalledOnce();
  expect(preview.stop).toHaveBeenCalledOnce();
});

test("reconnects a screenshot session after preview restart", async () => {
  let running = false;
  const preview = {
    status: vi.fn(() =>
      running
        ? {
            url: "http://127.0.0.1:3000/",
            running: true as const,
            mode: "iterative" as const,
          }
        : { running: false as const }
    ),
    startAndWait: vi.fn(async () => {
      running = true;
      return {
        url: "http://127.0.0.1:3000/",
        running: true as const,
        mode: "iterative" as const,
      };
    }),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const connectionClosed = new BrowserSessionClosedError(
    "Browser DevTools connection closed."
  );
  const firstClose = vi.fn(async () => undefined);
  const firstCapturePage = vi.fn(async () => {
    throw connectionClosed;
  });
  const captureScreenshot = createCaptureScreenshotMock([]);
  const secondCapturePage = vi.fn(
    async (optionsList) => await Promise.all(optionsList.map(captureScreenshot))
  );
  const createCaptureSession = vi
    .fn()
    .mockReturnValueOnce({
      capture: vi.fn(),
      capturePage: firstCapturePage,
      close: firstClose,
    })
    .mockReturnValueOnce({
      capture: vi.fn(),
      capturePage: secondCapturePage,
      close: vi.fn(async () => undefined),
    });
  const progress: string[] = [];
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview: vi.fn(async () => ({ cwd: "/tmp/preview" })),
    createCaptureSession,
  });

  await handlers.startPreview({ source: "session", mode: "iterative" });
  await expect(
    handlers.capturePageScreenshots(
      [
        {
          path: "/",
          source: "session",
          viewport: { width: 1440, height: 900 },
          fullPage: true,
        },
      ],
      { report: (message) => progress.push(message) }
    )
  ).resolves.toEqual([
    expect.objectContaining({
      viewport: { width: 1440, height: 900 },
    }),
  ]);

  expect(preview.startAndWait).toHaveBeenCalledOnce();
  expect(createCaptureSession).toHaveBeenCalledTimes(2);
  expect(firstCapturePage).toHaveBeenCalledOnce();
  expect(firstClose).toHaveBeenCalledOnce();
  expect(secondCapturePage).toHaveBeenCalledWith([
    expect.objectContaining({
      url: "http://127.0.0.1:3000/",
      width: 1440,
      height: 900,
      fullPage: true,
    }),
  ]);
  expect(progress).toContain("tool screenshot reconnecting browser session");
});

test("times out a stalled screenshot after preview start and releases its session", async () => {
  let running = false;
  const stop = vi.fn(async () => {
    running = false;
    return { running: false as const };
  });
  const preview = {
    status: vi.fn(() =>
      running
        ? {
            url: "http://127.0.0.1:5173/",
            running: true as const,
            mode: "iterative" as const,
          }
        : { running: false as const }
    ),
    startAndWait: vi.fn(async () => {
      running = true;
      return {
        url: "http://127.0.0.1:5173/",
        running: true as const,
        mode: "iterative" as const,
      };
    }),
    resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
    stop,
  };
  const close = vi.fn(async () => undefined);
  const handlers = createMcpPreviewHandlers({
    preview,
    preparePreview: vi.fn(async () => ({ cwd: "/tmp/preview" })),
    createCaptureSession: vi.fn(() => ({
      capture: vi.fn(() => new Promise<never>(() => undefined)),
      capturePage: vi.fn(),
      close,
    })) as never,
  });

  await handlers.startPreview({ source: "session", mode: "iterative" });
  await expect(
    handlers.captureScreenshot({
      path: "/",
      source: "session",
      mode: "iterative",
      viewport: { width: 1440, height: 900 },
      timeout: 5,
    })
  ).rejects.toMatchObject({ code: "SCREENSHOT_TIMEOUT" });
  expect(close).toHaveBeenCalledOnce();

  await expect(handlers.stopPreview()).resolves.toEqual({ running: false });
  expect(stop).toHaveBeenCalledOnce();
});

test("leaves time to start a fallback browser within the MCP timeout", async () => {
  const createBrowserScreenshotSession = vi.fn(async (options) => {
    if (options.browserPath === "/usr/bin/chromium") {
      await new Promise((resolve) =>
        setTimeout(resolve, options.startupTimeout ?? options.timeout)
      );
      throw new BrowserStartupError("Chromium startup timed out.");
    }
    return {
      capture: vi.fn(async () => ({
        navigation: {
          requestedUrl: options.url,
          finalUrl: options.url,
          redirects: [],
          documentReadyState: "complete" as const,
          pageMetadata: { rootMarkerPresent: true },
          layoutStable: true,
        },
        viewportWidth: options.width,
        viewportHeight: options.height,
        contentWidth: options.width,
        contentHeight: options.height,
        horizontalOverflow: false,
      })),
      capturePage: vi.fn(async () => []),
      close: vi.fn(async () => undefined),
    };
  });
  const dependencies: ScreenshotDependencies = {
    ...defaultScreenshotDependencies,
    env: {},
    platform: "linux",
    access: vi.fn(async (path) => {
      if (path === "/usr/bin/chromium" || path === "/usr/bin/google-chrome") {
        return;
      }
      throw new Error("missing");
    }),
    which: vi.fn(async (command) => {
      if (command === "chromium") {
        return "/usr/bin/chromium";
      }
      if (command === "google-chrome") {
        return "/usr/bin/google-chrome";
      }
    }),
    getChromeLauncherInstallations: vi.fn(() => []),
    getPlaywrightInstallations: vi.fn(async () => []),
    mkdir: vi.fn(async () => undefined),
    createBrowserScreenshotSession,
    readArtifactByte: vi.fn(async () => 1),
  };
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession: () => createScreenshotCaptureSession(dependencies),
  });

  await expect(
    handlers.captureScreenshot({
      path: "/",
      source: "session",
      viewport: { width: 800, height: 600 },
      timeout: 200,
    })
  ).resolves.toMatchObject({
    browser: { path: "/usr/bin/google-chrome" },
  });
  expect(createBrowserScreenshotSession).toHaveBeenCalledTimes(2);
});

test("applies internal page credentials only to owned preview captures", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const capture = createCaptureScreenshotMock([]);
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession: () => ({
      capture,
      capturePage: vi.fn(async () => []),
      close: vi.fn(async () => undefined),
    }),
    getHttpCredentials: (path) =>
      path === "/private"
        ? { username: "editor", password: "secret" }
        : undefined,
  });

  await handlers.captureScreenshot({
    path: "/private",
    source: "session",
    mode: "production",
    viewport: { width: 1440, height: 900 },
  });

  expect(capture).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "http://127.0.0.1:3000/private",
      httpCredentials: { username: "editor", password: "secret" },
    })
  );
});

test("waits for an active capture before stopping preview resources", async () => {
  let finishCapture: () => void = () => undefined;
  const captureBlocked = new Promise<void>((resolve) => {
    finishCapture = resolve;
  });
  const capture = vi.fn(async () => {
    await captureBlocked;
    return createCaptureScreenshotMock([])({
      url: "http://127.0.0.1:5173/",
      width: 1280,
      height: 720,
    });
  });
  const close = vi.fn(async () => undefined);
  const stop = vi.fn(async () => ({
    url: "http://127.0.0.1:5173/",
    running: false,
    mode: "iterative" as const,
  }));
  const handlers = createMcpPreviewHandlers({
    preview: {
      status: vi.fn(() => ({
        url: "http://127.0.0.1:5173/",
        running: true,
        mode: "iterative" as const,
      })),
      startAndWait: vi.fn(),
      resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
      stop,
    },
    isStale: () => false,
    createCaptureSession: vi.fn(() => ({
      capture,
      capturePage: vi.fn(async () => []),
      close,
    })),
  });

  const captureResult = handlers.captureScreenshot({
    path: "/",
    viewport: { width: 1280, height: 720 },
  });
  await vi.waitFor(() => expect(capture).toHaveBeenCalledOnce());
  const stopResult = handlers.stopPreview();
  await Promise.resolve();
  expect(stop).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();

  finishCapture();
  await captureResult;
  await stopResult;
  expect(close).toHaveBeenCalledOnce();
  expect(stop).toHaveBeenCalledOnce();
});

test("recreates the capture session when the browser configuration changes", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const firstClose = vi.fn(async () => undefined);
  const secondClose = vi.fn(async () => undefined);
  const createCaptureSession = vi
    .fn()
    .mockReturnValueOnce({
      capture: createCaptureScreenshotMock([]),
      capturePage: vi.fn(async () => []),
      close: firstClose,
    })
    .mockReturnValueOnce({
      capture: createCaptureScreenshotMock([]),
      capturePage: vi.fn(async () => []),
      close: secondClose,
    });
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  await handlers.captureScreenshot({
    path: "/one",
    source: "session",
    browser: "chromium",
    viewport: { width: 1440, height: 900 },
  });
  await handlers.captureScreenshot({
    path: "/two",
    source: "session",
    browser: "chrome",
    viewport: { width: 1440, height: 900 },
  });

  expect(createCaptureSession).toHaveBeenCalledTimes(2);
  expect(firstClose).toHaveBeenCalledOnce();
  expect(secondClose).not.toHaveBeenCalled();
});

test("stops the owned preview when browser capture cleanup fails", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
    stop: vi.fn(async () => ({
      url: "",
      running: false,
      mode: "iterative" as const,
    })),
  };
  const cleanupError = new Error("browser cleanup failed");
  const createCaptureSession = vi.fn(() => ({
    capture: createCaptureScreenshotMock([]),
    capturePage: vi.fn(async () => []),
    close: vi.fn(async () => {
      throw cleanupError;
    }),
  }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  await handlers.captureScreenshot({
    path: "/one",
    source: "session",
    viewport: { width: 1440, height: 900 },
  });

  await expect(handlers.stopPreview()).rejects.toBe(cleanupError);
  expect(preview.stop).toHaveBeenCalledOnce();
});

test("captures one session page across multiple viewports through resize", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const capture = createCaptureScreenshotMock([]);
  const capturePage = vi.fn(
    async (optionsList) => await Promise.all(optionsList.map(capture))
  );
  const close = vi.fn(async () => undefined);
  const createCaptureSession = vi.fn(() => ({
    capture,
    capturePage,
    close,
  }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  const results = await handlers.capturePageScreenshots([
    {
      path: "/responsive",
      source: "session",
      viewport: { width: 375, height: 812 },
      waitForTimeout: 0,
    },
    {
      path: "/responsive",
      viewport: { width: 1440, height: 900 },
      waitForTimeout: 0,
    },
  ]);

  expect(results.map((result) => result.viewport.width)).toEqual([375, 1440]);
  expect(createCaptureSession).toHaveBeenCalledOnce();
  expect(capturePage).toHaveBeenCalledWith([
    expect.objectContaining({
      url: "http://127.0.0.1:3000/responsive",
      width: 375,
      waitForTimeout: 0,
    }),
    expect.objectContaining({
      url: "http://127.0.0.1:3000/responsive",
      width: 1440,
      waitForTimeout: 0,
    }),
  ]);
  expect(preview.startAndWait).not.toHaveBeenCalled();
});

test("prepares one local page for multiple viewport captures", async () => {
  let running = false;
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(async () => {
      running = true;
      return {
        url: "http://127.0.0.1:5173/",
        running: true,
        mode: "production" as const,
      };
    }),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:5173${path}`),
  };
  const capture = createCaptureScreenshotMock([]);
  const capturePage = vi.fn(
    async (optionsList) => await Promise.all(optionsList.map(capture))
  );
  const createCaptureSession = vi.fn(() => ({
    capture,
    capturePage,
    close: vi.fn(async () => undefined),
  }));
  const preparePreview = vi.fn(async () => ({ cwd: "/tmp/local-preview" }));
  const handlers = createMcpPreviewHandlers({
    preview,
    preparePreview,
    createCaptureSession,
    isStale: () => false,
  });

  const results = await handlers.capturePageScreenshots(
    [1440, 768, 390].map((width) => ({
      path: "/responsive",
      source: "local" as const,
      mode: "production" as const,
      browserPath: "/browser",
      viewport: { width, height: 900 },
    }))
  );

  expect(results.map((result) => result.viewport.width)).toEqual([
    1440, 768, 390,
  ]);
  expect(preparePreview).toHaveBeenCalledOnce();
  expect(preview.startAndWait).toHaveBeenCalledOnce();
  expect(createCaptureSession).toHaveBeenCalledOnce();
  expect(capturePage).toHaveBeenCalledWith([
    expect.objectContaining({ width: 1440, browserPath: "/browser" }),
    expect.objectContaining({ width: 768, browserPath: "/browser" }),
    expect.objectContaining({ width: 390, browserPath: "/browser" }),
  ]);
});

test("times out a stalled responsive capture and releases its session", async () => {
  const close = vi.fn(async () => undefined);
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:3000/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession: vi.fn(() => ({
      capture: vi.fn(),
      capturePage: vi.fn(() => new Promise<never>(() => undefined)),
      close,
    })) as never,
  });

  await expect(
    handlers.capturePageScreenshots(
      [375, 768, 1024, 1440].map((width) => ({
        path: "/responsive",
        source: "session" as const,
        mode: "iterative" as const,
        viewport: { width, height: 900 },
        timeout: 5,
      }))
    )
  ).rejects.toMatchObject({ code: "SCREENSHOT_TIMEOUT" });
  expect(close).toHaveBeenCalledOnce();
});

test.each([
  ["browser", { browser: "chromium" as const }, { browser: "chrome" as const }],
  ["mode", { mode: "iterative" as const }, { mode: "production" as const }],
  ["host", { host: "127.0.0.1" }, { host: "localhost" }],
  ["port", { port: 5173 }, { port: 5174 }],
  [
    "image domains",
    { imageDomains: ["one.example.com"] as string[] },
    { imageDomains: ["two.example.com"] as string[] },
  ],
] as const)(
  "rejects resized captures with mixed %s",
  async (_, first, second) => {
    const createCaptureSession = vi.fn();
    const handlers = createMcpPreviewHandlers({
      preview: {
        status: vi.fn(() => ({
          url: "http://127.0.0.1:3000/",
          running: true,
          mode: "iterative" as const,
        })),
        startAndWait: vi.fn(),
        resolveUrl: vi.fn(),
      },
      createCaptureSession,
    });

    await expect(
      handlers.capturePageScreenshots([
        {
          path: "/responsive",
          source: "session",
          ...first,
          viewport: { width: 375, height: 812 },
        },
        {
          path: "/responsive",
          source: "session",
          ...second,
          viewport: { width: 1440, height: 900 },
        },
      ])
    ).rejects.toThrow("one generated preview target and browser configuration");
    expect(createCaptureSession).not.toHaveBeenCalled();
  }
);

test("captures path screenshots through an existing base URL without preview", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn(),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);
  const preparePreview = vi.fn(async () => {
    events.push("prepare");
    return { cwd: "/tmp/generated-preview" };
  });
  const progress: string[] = [];

  const handlers = createMcpPreviewHandlers({
    preview,
    preparePreview,
    captureScreenshot,
  });

  const result = await handlers.captureScreenshot(
    {
      baseUrl: "http://127.0.0.1:5177",
      path: "/design-system",
      viewport: { width: 1440, height: 900 },
    },
    {
      report: (message) => {
        progress.push(message);
      },
    }
  );

  expect(preview.status).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
  expect(preview.resolveUrl).not.toHaveBeenCalled();
  expect(preparePreview).not.toHaveBeenCalled();
  expect(events).toEqual(["capture:http://127.0.0.1:5177/design-system"]);
  expect(result).not.toHaveProperty("previewMode");
  expect(progress).toEqual([
    "tool screenshot capturing http://127.0.0.1:5177/design-system",
  ]);
});

test.each([
  ["absolute URL", { url: "http://127.0.0.1:5177/design-system" }],
  ["base URL", { baseUrl: "http://127.0.0.1:5177", path: "/design-system" }],
] as const)(
  "closes the browser after capturing an external %s",
  async (_, target) => {
    const captureScreenshot = createCaptureScreenshotMock([]);
    const createCaptureSession = vi.fn();
    const handlers = createMcpPreviewHandlers({
      preview: {
        status: vi.fn(),
        startAndWait: vi.fn(),
        resolveUrl: vi.fn(),
      },
      captureScreenshot,
      createCaptureSession,
    });

    await handlers.captureScreenshot({
      ...target,
      timeout: 45_000,
      viewport: { width: 1440, height: 900 },
    });

    expect(captureScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://127.0.0.1:5177/design-system",
        timeout: 45_000,
      })
    );
    expect(createCaptureSession).not.toHaveBeenCalled();
  }
);

test("rejects authenticated Builder URLs as generated preview targets", async () => {
  const preview = {
    status: vi.fn(),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn(),
  };
  const captureScreenshot = vi.fn();
  const handlers = createMcpPreviewHandlers({ preview, captureScreenshot });

  await expect(
    handlers.captureScreenshot({
      url: "https://p-project.wstd.dev:5173/?authToken=secret&mode=design",
      viewport: { width: 1440, height: 900 },
    })
  ).rejects.toMatchObject({ code: "BUILDER_URL_IS_NOT_SITE_PREVIEW" });
  await expect(
    handlers.captureScreenshot({
      baseUrl:
        "https://p-project.apps.webstudio.is/?authToken=secret&mode=preview",
      path: "/pricing",
      viewport: { width: 1440, height: 900 },
    })
  ).rejects.toMatchObject({ code: "BUILDER_URL_IS_NOT_SITE_PREVIEW" });

  expect(captureScreenshot).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
});

test("captures path screenshots through an explicit preview target", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(async (options) => {
      events.push(
        `start:${options.cwd}:${options.host}:${options.port}:${options.restart}`
      );
      return {
        url: "http://127.0.0.1:5175/",
        running: true,
        mode: "iterative" as const,
      };
    }),
    resolveUrl: vi.fn((path: string) => {
      events.push(`resolve:${path}`);
      return `http://127.0.0.1:5175${path}`;
    }),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);
  const preparePreview = vi.fn(async (source: unknown) => {
    events.push(`prepare:${source}`);
    return { cwd: "/tmp/generated-preview" };
  });

  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview,
    captureScreenshot,
  });

  await handlers.captureScreenshot({
    path: "/design-system",
    source: "session",
    host: "127.0.0.1",
    port: 5175,
    viewport: { width: 1440, height: 900 },
  });

  expect(events).toEqual([
    "prepare:session",
    "start:/tmp/generated-preview:127.0.0.1:5175:true",
    "resolve:/design-system",
    "capture:http://127.0.0.1:5175/design-system",
  ]);
});

test("refreshes stale iterative preview without restarting server or browser", async () => {
  const capture = vi.fn(async () => ({
    output: "current.png",
    browser: {
      browser: "chromium" as const,
      path: "/browser",
      source: "path" as const,
    },
    viewport: { width: 1280, height: 720 },
    fullPage: false,
    elapsedMs: 1,
    warnings: [],
  }));
  const close = vi.fn(async () => undefined);
  const createCaptureSession = vi.fn(() => ({
    capture,
    capturePage: vi.fn(),
    close,
  }));
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "iterative" as const,
    })),
    canReuse: vi.fn(() => true),
    resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
  };
  const preparePreview = vi.fn(async () => ({ cwd: "/tmp/preview" }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => true,
    preparePreview,
    createCaptureSession: createCaptureSession as never,
  });

  await handlers.captureScreenshot({
    path: "/",
    imageDomains: ["images.example.com"],
    viewport: { width: 1280, height: 720 },
  });

  expect(preparePreview).toHaveBeenCalledWith("session", undefined, {
    preserveGeneratedProject: true,
    prepareForIncrementalGeneration: true,
  });
  expect(preview.startAndWait).toHaveBeenCalledWith(
    expect.objectContaining({
      imageDomains: ["images.example.com"],
      mode: "iterative",
      restart: false,
    })
  );
  expect(preview.canReuse).toHaveBeenCalledWith({
    host: undefined,
    port: undefined,
    imageDomains: ["images.example.com"],
    mode: "iterative",
  });
  expect(createCaptureSession).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
});

test.each([
  ["local", "session"],
  ["session", "local"],
] as const)(
  "refreshes iterative preview when source changes from %s to %s",
  async (initialSource, nextSource) => {
    let running = false;
    const preview = {
      status: vi.fn(() => ({
        url: "http://127.0.0.1:5173/",
        running,
        mode: "iterative" as const,
      })),
      startAndWait: vi.fn(async () => {
        running = true;
        return {
          url: "http://127.0.0.1:5173/",
          running: true,
          mode: "iterative" as const,
        };
      }),
      canReuse: vi.fn(() => running),
      resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
    };
    const preparePreview = vi.fn(async () => ({ cwd: "/tmp/preview" }));
    const handlers = createMcpPreviewHandlers({
      preview,
      isStale: () => false,
      preparePreview,
      captureScreenshot: createCaptureScreenshotMock([]),
    });

    await handlers.startPreview({ source: initialSource });
    await handlers.captureScreenshot({
      path: "/",
      source: nextSource,
      viewport: { width: 1280, height: 720 },
    });

    expect(preparePreview).toHaveBeenNthCalledWith(2, nextSource, undefined, {
      preserveGeneratedProject: true,
      prepareForIncrementalGeneration: true,
    });
    expect(preview.startAndWait).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ restart: false })
    );
  }
);

test("restarts production preview instead of incrementally reusing it", async () => {
  const preview = {
    status: vi.fn(() => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "production" as const,
    })),
    startAndWait: vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      running: true,
      mode: "production" as const,
    })),
    resolveUrl: vi.fn(),
  };
  const preparePreview = vi.fn(async () => ({ cwd: "/tmp/preview" }));
  const handlers = createMcpPreviewHandlers({ preview, preparePreview });

  await handlers.startPreview({ mode: "production" });

  expect(preparePreview).toHaveBeenCalledWith("session", undefined, {
    preserveGeneratedProject: false,
    prepareForIncrementalGeneration: false,
  });
  expect(preview.startAndWait).toHaveBeenCalledWith(
    expect.objectContaining({ mode: "production", restart: true })
  );
});

test("rejects a generated route that rendered Builder chrome", async () => {
  const handlers = createMcpPreviewHandlers({
    preview: {
      status: vi.fn(() => ({
        url: "http://127.0.0.1:5173/",
        running: true,
        mode: "iterative" as const,
      })),
      startAndWait: vi.fn(),
      resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
    },
    isStale: () => false,
    captureScreenshot: vi.fn(async () => ({
      output: "builder.png",
      browser: {
        browser: "chromium" as const,
        path: "/browser",
        source: "path" as const,
      },
      viewport: { width: 1280, height: 720 },
      fullPage: false,
      elapsedMs: 1,
      warnings: [],
      navigation: {
        requestedUrl: "http://127.0.0.1:5173/",
        finalUrl: "http://127.0.0.1:5173/",
        redirects: [],
        documentReadyState: "complete",
        generatedSiteRootPresent: false,
        layoutStable: true,
      },
    })),
  });

  await expect(
    handlers.captureScreenshot({
      path: "/",
      viewport: { width: 1280, height: 720 },
    })
  ).rejects.toMatchObject({ code: "SCREENSHOT_NOT_GENERATED_SITE" });
});

test("retries a managed generated route while the refreshed preview settles", async () => {
  const createResult = (generatedSiteRootPresent: boolean) => ({
    output: "account.png",
    browser: {
      browser: "chromium" as const,
      path: "/browser",
      source: "path" as const,
    },
    viewport: { width: 1280, height: 720 },
    fullPage: false,
    elapsedMs: 1,
    warnings: [],
    navigation: {
      requestedUrl: "http://127.0.0.1:5173/account",
      finalUrl: "http://127.0.0.1:5173/account",
      redirects: [],
      documentReadyState: "complete",
      generatedSiteRootPresent,
      layoutStable: true,
    },
  });
  const capture = vi
    .fn()
    .mockResolvedValueOnce(createResult(false))
    .mockResolvedValueOnce(createResult(true));
  const sleep = vi.fn(async () => undefined);
  const handlers = createMcpPreviewHandlers({
    preview: {
      status: vi.fn(() => ({
        url: "http://127.0.0.1:5173/",
        running: true,
        mode: "iterative" as const,
      })),
      startAndWait: vi.fn(),
      resolveUrl: vi.fn(() => "http://127.0.0.1:5173/account"),
    },
    isStale: () => false,
    createCaptureSession: vi.fn(() => ({
      capture,
      capturePage: vi.fn(),
      close: vi.fn(),
    })) as never,
    sleep,
  });

  await expect(
    handlers.captureScreenshot({
      path: "/account",
      viewport: { width: 1280, height: 720 },
    })
  ).resolves.toMatchObject({
    navigation: { generatedSiteRootPresent: true },
  });
  expect(capture).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(1000);
});

test("rejects resized generated routes that rendered Builder chrome", async () => {
  const capturePage = vi.fn(async () => [
    {
      output: "builder.png",
      browser: {
        browser: "chromium" as const,
        path: "/browser",
        source: "path" as const,
      },
      viewport: { width: 1280, height: 720 },
      fullPage: false,
      elapsedMs: 1,
      warnings: [],
      navigation: {
        requestedUrl: "http://127.0.0.1:5173/",
        finalUrl: "http://127.0.0.1:5173/",
        redirects: [],
        documentReadyState: "complete",
        generatedSiteRootPresent: false,
        layoutStable: true,
      },
    },
  ]);
  const handlers = createMcpPreviewHandlers({
    preview: {
      status: vi.fn(() => ({
        url: "http://127.0.0.1:5173/",
        running: true,
        mode: "iterative" as const,
      })),
      startAndWait: vi.fn(),
      resolveUrl: vi.fn(() => "http://127.0.0.1:5173/"),
    },
    isStale: () => false,
    createCaptureSession: vi.fn(() => ({
      capture: vi.fn(),
      capturePage,
      close: vi.fn(),
    })) as never,
  });

  await expect(
    handlers.capturePageScreenshots([
      {
        path: "/",
        source: "session",
        viewport: { width: 1280, height: 720 },
      },
    ])
  ).rejects.toMatchObject({ code: "SCREENSHOT_NOT_GENERATED_SITE" });
});
