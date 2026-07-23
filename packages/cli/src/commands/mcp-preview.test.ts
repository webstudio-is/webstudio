import { expect, test, vi } from "vitest";
import { createMcpPreviewHandlers } from "./mcp-preview";

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
  const prepareSessionDataFile = vi.fn(async () => undefined);
  const preparePreview = vi.fn(async (source, prepareSessionDataFile) => {
    events.push(`prepare:${source}`);
    await prepareSessionDataFile?.();
    return { cwd: "/tmp/generated-preview" };
  });
  const progress: string[] = [];

  const handlers = createMcpPreviewHandlers({
    preview,
    preparePreview,
    prepareSessionDataFile,
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
    }
  );
  expect(prepareSessionDataFile).toHaveBeenCalledOnce();
  expect(events).toEqual([
    "prepare:session",
    "start:/tmp/generated-preview:true",
  ]);
  expect(progress).toEqual([
    "tool preview.start preparing generated preview project",
    "tool preview.start starting iterative preview server",
  ]);
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
    ).rejects.toThrow("one session preview target and browser configuration");
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
