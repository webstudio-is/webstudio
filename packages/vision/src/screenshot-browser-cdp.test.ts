import { Buffer } from "node:buffer";
import { expect, test, vi } from "vitest";
import {
  captureBrowserScreenshot,
  createBrowserScreenshotSession,
  type BrowserScreenshotDependencies,
} from "./browser";

class FakeBrowserStderr {
  readonly listeners: Array<(chunk: unknown) => void> = [];
  on = (_event: string, listener: (chunk: unknown) => void) => {
    this.listeners.push(listener);
    return this;
  };
  emit = (chunk: unknown) => {
    for (const listener of this.listeners) {
      listener(chunk);
    }
  };
}

class FakeBrowserProcess {
  readonly listeners = new Map<string, Array<(value?: unknown) => void>>();
  readonly stderr = new FakeBrowserStderr();
  kill = vi.fn((_signal?: NodeJS.Signals | number) => {
    this.emit("exit", 0);
    return true;
  });
  once = vi.fn((event: string, listener: (value?: unknown) => void) => {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return this;
  });
  emit = (event: string, value?: unknown) => {
    const listeners = this.listeners.get(event) ?? [];
    this.listeners.delete(event);
    for (const listener of listeners) {
      listener(value);
    }
  };
}

class FakeWebSocket {
  readonly sentMethods: string[] = [];
  readonly sentMessages: Array<{
    id: number;
    method: string;
    params?: Record<string, unknown>;
  }> = [];
  readonly listeners = new Map<
    string,
    Array<(event: { data?: string }) => void>
  >();
  readonly status: number;
  readonly finalUrl?: string;
  readonly subframeStatus?: number;
  readonly readinessWidths?: number[];
  readonly lifecycleFrames: string[];
  imageInspectionFinished = false;
  screenshotStartedBeforeImageInspectionFinished = false;
  private currentUrl = "about:blank";

  constructor(
    status = 200,
    finalUrl?: string,
    subframeStatus?: number,
    readinessWidths?: number[],
    lifecycleFrames = ["main"]
  ) {
    this.status = status;
    this.finalUrl = finalUrl;
    this.subframeStatus = subframeStatus;
    this.readinessWidths = readinessWidths;
    this.lifecycleFrames = lifecycleFrames;
    setTimeout(() => this.emit("open"), 0);
  }

  addEventListener = (
    event: string,
    listener: (event: { data?: string }) => void
  ) => {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  };

  close = vi.fn();

  send = (data: string) => {
    const message = JSON.parse(data) as {
      id: number;
      method: string;
      params?: Record<string, unknown>;
    };
    this.sentMessages.push(message);
    this.sentMethods.push(message.method);
    const respond = (result: unknown = {}) => {
      this.emit("message", {
        data: JSON.stringify({ id: message.id, result }),
      });
    };
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("rootMarkerPresent")
    ) {
      const hasPageMetadata = message.params.expression.includes(
        '"rootMarkerAttribute":"data-site"'
      );
      setTimeout(
        () =>
          respond({
            result: {
              value: {
                documentReadyState: "complete",
                ...(hasPageMetadata
                  ? {
                      pageMetadata: {
                        rootMarkerPresent: true,
                        id: "site",
                        version: 2,
                      },
                    }
                  : {}),
                width: this.readinessWidths?.shift() ?? 813,
                height: 2346,
              },
            },
          }),
        0
      );
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      message.params?.expression === "window.location.href"
    ) {
      setTimeout(() => respond({ result: { value: this.currentUrl } }), 0);
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("document.documentElement.scrollWidth")
    ) {
      setTimeout(
        () =>
          respond({
            result: {
              value: {
                scrollWidth: 813,
                scrollHeight: 2346,
                horizontalOverflowSuppressed: true,
                documentType: "text/html",
              },
            },
          }),
        0
      );
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("parseOpaqueRgb")
    ) {
      setTimeout(
        () =>
          respond({
            result: {
              value: [
                {
                  instanceId: "hero-title",
                  tagName: "h1",
                  foreground: "rgb(120, 120, 120)",
                  background: "rgb(255, 255, 255)",
                  ratio: 4.42,
                  requiredRatio: 4.5,
                  fontSize: 16,
                  fontWeight: 400,
                },
              ],
            },
          }),
        0
      );
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("const overlapLimit")
    ) {
      setTimeout(
        () =>
          respond({
            result: {
              value: {
                total: 2,
                sampled: 2,
                truncated: false,
                elements: [
                  {
                    instanceId: "hero",
                    tagName: "section",
                    x: 0,
                    y: 0,
                    width: 800,
                    height: 600,
                    visible: true,
                    clippedX: false,
                    clippedY: true,
                    overlapsWith: ["overlay"],
                  },
                  {
                    instanceId: "overlay",
                    tagName: "div",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    visible: false,
                    hiddenReason: "display",
                    clippedX: false,
                    clippedY: false,
                    overlapsWith: [],
                  },
                ],
              },
            },
          }),
        0
      );
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("document.querySelector")
    ) {
      setTimeout(() => respond({ result: { value: true } }), 0);
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes(
        'performance.getEntriesByType("resource")'
      )
    ) {
      setTimeout(
        () =>
          respond({
            result: {
              value: [
                {
                  pathname: "/styles.css",
                  initiatorType: "link",
                  transferSize: 12000,
                  encodedBodySize: 11000,
                  decodedBodySize: 40000,
                  duration: 25,
                  renderBlockingStatus: "blocking",
                },
                {
                  pathname: "/fonts/brand.ttf",
                  initiatorType: "css",
                  transferSize: 80000,
                  encodedBodySize: 79000,
                  decodedBodySize: 79000,
                  duration: 40,
                },
              ],
            },
          }),
        0
      );
      return;
    }
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("Array.from(document.images")
    ) {
      setTimeout(() => {
        this.imageInspectionFinished = true;
        respond({
          result: {
            value: [
              {
                instanceId: "hero-image",
                sourcePathname: "/assets/hero.png",
                loading: "eager",
                complete: true,
                naturalWidth: 2400,
                naturalHeight: 1600,
                selectedSourceWidth: 1200,
                selectedSourceHeight: 800,
                renderedWidth: 600,
                renderedHeight: 400,
                top: 1000,
              },
            ],
          },
        });
      }, 0);
      return;
    }
    if (message.method === "Page.captureScreenshot") {
      this.screenshotStartedBeforeImageInspectionFinished =
        this.imageInspectionFinished === false;
      setTimeout(
        () =>
          respond({
            data: Buffer.from("fake-png").toString("base64"),
          }),
        0
      );
      return;
    }
    if (message.method === "Page.getLayoutMetrics") {
      setTimeout(
        () =>
          respond({
            cssContentSize: {
              x: 0,
              y: 0,
              width: 812.4,
              height: 2345.6,
            },
            cssLayoutViewport: {
              clientWidth: 800,
              clientHeight: 600,
            },
          }),
        0
      );
      return;
    }
    setTimeout(() => {
      respond(
        message.method === "Page.navigate"
          ? { frameId: "main", loaderId: "main-loader" }
          : {}
      );
      if (message.method === "Page.navigate") {
        const requestedUrl = String(message.params?.url);
        this.currentUrl = this.finalUrl ?? requestedUrl;
        if (this.currentUrl !== requestedUrl) {
          this.emit("message", {
            data: JSON.stringify({
              method: "Network.requestWillBeSent",
              params: {
                type: "Document",
                frameId: "main",
                redirectResponse: { url: requestedUrl },
              },
            }),
          });
        }
        this.emit("message", {
          data: JSON.stringify({
            method: "Network.responseReceived",
            params: {
              type: "Document",
              frameId: "main",
              response: {
                url: this.currentUrl,
                status: this.status,
                statusText: this.status === 404 ? "Not Found" : "OK",
                mimeType: "text/html",
              },
            },
          }),
        });
        if (this.subframeStatus !== undefined) {
          this.emit("message", {
            data: JSON.stringify({
              method: "Network.responseReceived",
              params: {
                type: "Document",
                frameId: "child",
                response: {
                  url: "https://embed.example/frame",
                  status: this.subframeStatus,
                  statusText: "Forbidden",
                  mimeType: "text/html",
                },
              },
            }),
          });
        }
        for (const frameId of this.lifecycleFrames) {
          this.emit("message", {
            data: JSON.stringify({
              method: "Page.lifecycleEvent",
              params: {
                name: "networkIdle",
                frameId,
                loaderId:
                  frameId === "main" ? "main-loader" : `${frameId}-loader`,
              },
            }),
          });
        }
      }
    }, 0);
  };

  emit = (event: string, payload: { data?: string } = {}) => {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  };
}

class HangingWebSocket extends FakeWebSocket {
  send = () => {
    this.sentMethods.push("unanswered");
  };
}

class ClosingWebSocket extends FakeWebSocket {
  send = () => {
    setTimeout(() => this.emit("close"), 0);
  };
}

class CrashingWebSocket extends FakeWebSocket {
  readonly #browserProcess: FakeBrowserProcess;
  #crashed = false;

  constructor(browserProcess: FakeBrowserProcess) {
    super();
    this.#browserProcess = browserProcess;
  }

  send = () => {
    if (this.#crashed === false) {
      this.#crashed = true;
      setTimeout(() => this.#browserProcess.emit("exit", 1), 0);
    }
  };
}

class NeverOpeningWebSocket {
  readonly listeners = new Map<
    string,
    Array<(event: { data?: string }) => void>
  >();
  addEventListener = (
    event: string,
    listener: (event: { data?: string }) => void
  ) => {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  };
  close = vi.fn();
  send = vi.fn();
}

class NavigationErrorWebSocket extends FakeWebSocket {
  send = (data: string) => {
    const message = JSON.parse(data) as {
      id: number;
      method: string;
      params?: Record<string, unknown>;
    };
    this.sentMethods.push(message.method);
    if (message.method === "Page.navigate") {
      setTimeout(
        () =>
          this.emit("message", {
            data: JSON.stringify({
              id: message.id,
              result: { errorText: "Cannot navigate to invalid URL" },
            }),
          }),
        0
      );
      return;
    }
    setTimeout(
      () =>
        this.emit("message", {
          data: JSON.stringify({ id: message.id, result: {} }),
        }),
      0
    );
  };
}

const createDependencies = ({
  browserProcess = new FakeBrowserProcess(),
  socket = new FakeWebSocket(),
  fetch,
}: {
  browserProcess?: FakeBrowserProcess;
  socket?: FakeWebSocket;
  fetch?: BrowserScreenshotDependencies["fetch"];
} = {}): BrowserScreenshotDependencies => {
  const defaultFetch = vi.fn(async (url: string) => ({
    json: async () =>
      url.includes("/json/new?")
        ? {
            id: "target-1",
            type: "page",
            webSocketDebuggerUrl: "ws://127.0.0.1:9222/page/created",
          }
        : {},
  })) as unknown as typeof globalThis.fetch;
  return {
    spawnBrowser: vi.fn(
      () => browserProcess
    ) as unknown as BrowserScreenshotDependencies["spawnBrowser"],
    mkdtemp: vi.fn(
      async () => "/tmp/vision-browser-test"
    ) as unknown as BrowserScreenshotDependencies["mkdtemp"],
    readFile: vi.fn(
      async () => "9222\n/devtools/browser/1\n"
    ) as unknown as BrowserScreenshotDependencies["readFile"],
    writeFile: vi.fn(async () => undefined),
    rm: vi.fn(async () => undefined),
    fetch: fetch ?? defaultFetch,
    createWebSocket: vi.fn(() => socket as unknown as WebSocket),
  };
};

test("captures through DevTools with lifecycle and selector waits", async () => {
  const browserProcess = new FakeBrowserProcess();
  const socket = new FakeWebSocket();
  const dependencies = createDependencies({ browserProcess, socket });

  await captureBrowserScreenshot(
    {
      url: "https://example.com",
      output: "/tmp/current.png",
      width: 800,
      height: 600,
      browserPath: "/usr/bin/chromium",
      uid: 1000,
      disableSandbox: true,
      waitUntil: "networkidle",
      waitForSelector: "#ready",
      pageMetadata: {
        rootMarkerAttribute: "data-site",
        idAttribute: "data-site",
        versionAttribute: "data-site-version",
      },
      instanceIdAttribute: "data-instance-id",
      waitForTimeout: 0,
      timeout: 1000,
    },
    dependencies
  );

  expect(dependencies.spawnBrowser).toHaveBeenCalledWith(
    "/usr/bin/chromium",
    expect.arrayContaining([
      "--headless=new",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--remote-debugging-port=0",
      "--user-data-dir=/tmp/vision-browser-test",
      "--window-size=800,600",
      "--no-sandbox",
      "about:blank",
    ])
  );
  expect(dependencies.fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:9222/json/new?about:blank",
    { method: "PUT" }
  );
  expect(dependencies.createWebSocket).toHaveBeenCalledWith(
    "ws://127.0.0.1:9222/page/created"
  );
  expect(socket.sentMethods).toEqual(
    expect.arrayContaining([
      "Page.enable",
      "Runtime.enable",
      "Page.setLifecycleEventsEnabled",
      "Emulation.setDeviceMetricsOverride",
      "Page.navigate",
      "Runtime.evaluate",
      "Page.captureScreenshot",
    ])
  );
  expect(
    socket.sentMessages.some(
      (message) =>
        message.method === "Runtime.evaluate" &&
        String(message.params?.expression).includes(
          '"rootMarkerAttribute":"data-site"'
        )
    )
  ).toBe(true);
  expect(dependencies.writeFile).toHaveBeenCalledWith(
    "/tmp/current.png",
    Buffer.from("fake-png")
  );
  expect(socket.close).toHaveBeenCalled();
  expect(browserProcess.kill).toHaveBeenCalled();
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-test", {
    recursive: true,
    force: true,
  });
});

test("ignores lifecycle readiness from child frames", async () => {
  const socket = new FakeWebSocket(200, undefined, undefined, undefined, [
    "child",
  ]);

  await expect(
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "networkidle",
        waitForTimeout: 0,
        timeout: 10,
      },
      createDependencies({ socket })
    )
  ).rejects.toMatchObject({
    code: "SCREENSHOT_TIMEOUT",
    message: expect.stringContaining("Page did not reach networkidle"),
  });
});

test("reuses one browser process across screenshot captures", async () => {
  const browserProcess = new FakeBrowserProcess();
  const dependencies = createDependencies({ browserProcess });
  vi.mocked(dependencies.createWebSocket)
    .mockImplementationOnce(() => new FakeWebSocket() as unknown as WebSocket)
    .mockImplementationOnce(() => new FakeWebSocket() as unknown as WebSocket);
  const session = await createBrowserScreenshotSession(
    {
      url: "https://example.com/one",
      output: "/tmp/one.png",
      width: 800,
      height: 600,
      browserPath: "/usr/bin/chromium",
      waitUntil: "networkidle",
      waitForTimeout: 0,
      timeout: 1000,
    },
    dependencies
  );

  await session.capture({
    url: "https://example.com/one",
    output: "/tmp/one.png",
    width: 800,
    height: 600,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle",
    waitForTimeout: 0,
    timeout: 1000,
  });
  await session.capture({
    url: "https://example.com/two",
    output: "/tmp/two.png",
    width: 390,
    height: 844,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle",
    waitForTimeout: 0,
    timeout: 1000,
  });

  expect(dependencies.spawnBrowser).toHaveBeenCalledOnce();
  expect(dependencies.createWebSocket).toHaveBeenCalledTimes(2);
  expect(dependencies.fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:9222/json/close/target-1"
  );
  expect(browserProcess.kill).not.toHaveBeenCalled();

  await session.close();

  expect(browserProcess.kill).toHaveBeenCalledOnce();
});

test("uses HTTP credentials for navigation without exposing them in results", async () => {
  const socket = new FakeWebSocket();
  const result = await captureBrowserScreenshot(
    {
      url: "http://127.0.0.1:5173/blog",
      httpCredentials: { username: "editor", password: "secret phrase" },
      output: "/tmp/authenticated.png",
      width: 800,
      height: 600,
      browserPath: "/usr/bin/chromium",
      waitUntil: "networkidle",
      waitForTimeout: 0,
      timeout: 1000,
    },
    createDependencies({ socket })
  );

  expect(
    socket.sentMessages.find((message) => message.method === "Page.navigate")
      ?.params?.url
  ).toBe("http://editor:secret%20phrase@127.0.0.1:5173/blog");
  expect(result.navigation).toMatchObject({
    requestedUrl: "http://127.0.0.1:5173/blog",
    finalUrl: "http://127.0.0.1:5173/blog",
  });
  expect(JSON.stringify(result)).not.toContain("secret");
});

test("navigates once while resizing one page through multiple viewports", async () => {
  const socket = new FakeWebSocket();
  const dependencies = createDependencies({ socket });
  const baseOptions = {
    url: "https://example.com/responsive",
    browserPath: "/usr/bin/chromium",
    includeImageMetrics: true,
    includeElementGeometry: false,
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(
    {
      ...baseOptions,
      output: "/tmp/mobile.png",
      width: 375,
      height: 812,
      prepareExpression: "window.renderStory('mobile')",
      finalizeExpression: "window.finishStory('mobile')",
    },
    dependencies
  );

  const layouts = await session.capturePage([
    {
      ...baseOptions,
      output: "/tmp/mobile.png",
      width: 375,
      height: 812,
      prepareExpression: "window.renderStory('mobile')",
      finalizeExpression: "window.finishStory('mobile')",
    },
    {
      ...baseOptions,
      output: "/tmp/desktop.png",
      width: 1440,
      height: 900,
      prepareExpression: "window.renderStory('desktop')",
      finalizeExpression: "window.finishStory('desktop')",
    },
  ]);

  expect(layouts).toHaveLength(2);
  expect(layouts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        timings: expect.objectContaining({ wallMs: expect.any(Number) }),
      }),
    ])
  );
  expect(
    socket.sentMessages.filter((message) => message.method === "Page.navigate")
  ).toHaveLength(1);
  expect(
    socket.sentMessages.filter(
      (message) => message.method === "Emulation.setFocusEmulationEnabled"
    )
  ).toEqual([expect.objectContaining({ params: { enabled: true } })]);
  expect(
    socket.sentMessages
      .filter(
        (message) => message.method === "Emulation.setDeviceMetricsOverride"
      )
      .map((message) => message.params?.width)
  ).toEqual([375, 1440]);
  expect(dependencies.createWebSocket).toHaveBeenCalledOnce();
  expect(dependencies.writeFile).toHaveBeenCalledTimes(2);
  expect(
    layouts.every(({ elementGeometry }) => elementGeometry === undefined)
  ).toBe(true);
  expect(
    socket.sentMessages
      .filter(
        (message) =>
          message.method === "Runtime.evaluate" &&
          String(message.params?.expression).startsWith("window.renderStory")
      )
      .map((message) => message.params?.expression)
  ).toEqual(["window.renderStory('mobile')", "window.renderStory('desktop')"]);
  expect(
    socket.sentMessages
      .filter(
        (message) =>
          message.method === "Runtime.evaluate" &&
          String(message.params?.expression).startsWith("window.finishStory")
      )
      .map((message) => message.params?.expression)
  ).toEqual(["window.finishStory('mobile')", "window.finishStory('desktop')"]);
  expect(
    socket.sentMessages.some(
      (message) =>
        message.method === "Runtime.evaluate" &&
        String(message.params?.expression).includes(
          "__visionImageDimensionCache"
        )
    )
  ).toBe(true);

  await session.close();
});

test("reuses one target while navigating and resizing multiple pages", async () => {
  const socket = new FakeWebSocket();
  const dependencies = createDependencies({ socket });
  const baseOptions = {
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(
    {
      ...baseOptions,
      url: "https://example.com/one",
      output: "/tmp/one-mobile.webp",
      width: 375,
      height: 812,
    },
    dependencies
  );

  const layouts = await session.capturePage([
    {
      ...baseOptions,
      url: "https://example.com/one",
      output: "/tmp/one-mobile.webp",
      width: 375,
      height: 812,
    },
    {
      ...baseOptions,
      url: "https://example.com/one",
      output: "/tmp/one-desktop.webp",
      width: 1440,
      height: 900,
    },
    {
      ...baseOptions,
      url: "https://example.com/two",
      output: "/tmp/two-mobile.webp",
      width: 375,
      height: 812,
    },
    {
      ...baseOptions,
      url: "https://example.com/two",
      output: "/tmp/two-desktop.webp",
      width: 1440,
      height: 900,
    },
  ]);

  expect(layouts).toHaveLength(4);
  expect(
    socket.sentMessages
      .filter((message) => message.method === "Page.navigate")
      .map((message) => message.params?.url)
  ).toEqual(["https://example.com/one", "https://example.com/two"]);
  expect(
    socket.sentMessages
      .filter(
        (message) => message.method === "Emulation.setDeviceMetricsOverride"
      )
      .map((message) => message.params?.width)
  ).toEqual([375, 1440, 375, 1440]);
  expect(dependencies.createWebSocket).toHaveBeenCalledOnce();
  expect(dependencies.writeFile).toHaveBeenCalledTimes(4);

  await session.close();
});

test("restarts the shared browser once after an unexpected exit", async () => {
  const firstProcess = new FakeBrowserProcess();
  const secondProcess = new FakeBrowserProcess();
  const dependencies = createDependencies();
  vi.mocked(dependencies.spawnBrowser)
    .mockReturnValueOnce(
      firstProcess as unknown as ReturnType<
        BrowserScreenshotDependencies["spawnBrowser"]
      >
    )
    .mockReturnValueOnce(
      secondProcess as unknown as ReturnType<
        BrowserScreenshotDependencies["spawnBrowser"]
      >
    );
  vi.mocked(dependencies.createWebSocket)
    .mockImplementationOnce(
      () => new CrashingWebSocket(firstProcess) as unknown as WebSocket
    )
    .mockImplementationOnce(() => new FakeWebSocket() as unknown as WebSocket);
  const options = {
    url: "https://example.com",
    output: "/tmp/restarted.png",
    width: 800,
    height: 600,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(options, dependencies);

  await expect(session.capture(options)).resolves.toMatchObject({
    viewportWidth: 800,
    viewportHeight: 600,
  });

  expect(dependencies.spawnBrowser).toHaveBeenCalledTimes(2);
  expect(dependencies.rm).toHaveBeenCalledTimes(1);

  await session.close();

  expect(secondProcess.kill).toHaveBeenCalledOnce();
  expect(dependencies.rm).toHaveBeenCalledTimes(2);
});

test("restarts a responsive capture when the DevTools connection closes", async () => {
  const firstProcess = new FakeBrowserProcess();
  const secondProcess = new FakeBrowserProcess();
  let recoveredSocket: FakeWebSocket | undefined;
  const dependencies = createDependencies();
  vi.mocked(dependencies.spawnBrowser)
    .mockReturnValueOnce(firstProcess as never)
    .mockReturnValueOnce(secondProcess as never);
  vi.mocked(dependencies.createWebSocket)
    .mockImplementationOnce(
      () => new ClosingWebSocket() as unknown as WebSocket
    )
    .mockImplementationOnce(() => {
      recoveredSocket = new FakeWebSocket();
      return recoveredSocket as unknown as WebSocket;
    });
  const options = {
    url: "https://example.com/responsive",
    output: "/tmp/mobile.png",
    width: 375,
    height: 812,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(options, dependencies);

  await expect(
    session.capturePage([
      options,
      { ...options, output: "/tmp/desktop.png", width: 1440, height: 900 },
    ])
  ).resolves.toHaveLength(2);

  expect(dependencies.spawnBrowser).toHaveBeenCalledTimes(2);
  expect(firstProcess.kill).toHaveBeenCalledOnce();
  expect(dependencies.writeFile).toHaveBeenCalledTimes(2);
  expect(
    recoveredSocket?.sentMessages
      .filter(
        (message) => message.method === "Emulation.setDeviceMetricsOverride"
      )
      .map((message) => message.params?.width)
  ).toEqual([375, 1440]);

  await session.close();

  expect(secondProcess.kill).toHaveBeenCalledOnce();
});

test("retries a browser restart after a transient startup failure", async () => {
  const firstProcess = new FakeBrowserProcess();
  const secondProcess = new FakeBrowserProcess();
  const dependencies = createDependencies();
  vi.mocked(dependencies.mkdtemp)
    .mockResolvedValueOnce("/tmp/vision-browser-first")
    .mockRejectedValueOnce(new Error("Temporary directory unavailable"))
    .mockResolvedValueOnce("/tmp/vision-browser-second");
  vi.mocked(dependencies.spawnBrowser)
    .mockReturnValueOnce(firstProcess as never)
    .mockReturnValueOnce(secondProcess as never);
  vi.mocked(dependencies.createWebSocket)
    .mockImplementationOnce(
      () => new CrashingWebSocket(firstProcess) as unknown as WebSocket
    )
    .mockImplementationOnce(() => new FakeWebSocket() as unknown as WebSocket);
  const options = {
    url: "https://example.com",
    output: "/tmp/restarted.png",
    width: 800,
    height: 600,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(options, dependencies);

  await expect(session.capture(options)).rejects.toThrow(
    "Temporary directory unavailable"
  );
  await expect(session.capture(options)).resolves.toMatchObject({
    viewportWidth: 800,
    viewportHeight: 600,
  });
  await session.close();

  expect(dependencies.mkdtemp).toHaveBeenCalledTimes(3);
  expect(secondProcess.kill).toHaveBeenCalledOnce();
});

test("closes a browser that finishes restarting during session cleanup", async () => {
  const firstProcess = new FakeBrowserProcess();
  const secondProcess = new FakeBrowserProcess();
  const dependencies = createDependencies();
  let resolveRestartDirectory: (directory: string) => void = () => undefined;
  const restartDirectory = new Promise<string>((resolve) => {
    resolveRestartDirectory = resolve;
  });
  vi.mocked(dependencies.mkdtemp)
    .mockResolvedValueOnce("/tmp/vision-browser-first")
    .mockReturnValueOnce(restartDirectory);
  vi.mocked(dependencies.spawnBrowser)
    .mockReturnValueOnce(firstProcess as never)
    .mockReturnValueOnce(secondProcess as never);
  vi.mocked(dependencies.createWebSocket).mockImplementationOnce(
    () => new CrashingWebSocket(firstProcess) as unknown as WebSocket
  );
  const options = {
    url: "https://example.com",
    output: "/tmp/restarted.png",
    width: 800,
    height: 600,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(options, dependencies);

  const capture = session.capture(options);
  await vi.waitFor(() => {
    expect(dependencies.mkdtemp).toHaveBeenCalledTimes(2);
  });
  const close = session.close();
  resolveRestartDirectory("/tmp/vision-browser-second");

  await expect(capture).rejects.toThrow(
    "Browser screenshot session was closed."
  );
  await close;
  expect(secondProcess.kill).toHaveBeenCalledOnce();
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-second", {
    recursive: true,
    force: true,
  });
});

test("removes the browser profile when spawning throws", async () => {
  const dependencies = createDependencies();
  vi.mocked(dependencies.spawnBrowser).mockImplementationOnce(() => {
    throw new Error("Browser spawn failed");
  });

  await expect(
    createBrowserScreenshotSession(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 1000,
      },
      dependencies
    )
  ).rejects.toMatchObject({
    code: "BROWSER_STARTUP_FAILED",
    message: "Browser spawn failed",
  });
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-test", {
    recursive: true,
    force: true,
  });
});

test("closes a DevTools socket that does not open before the deadline", async () => {
  const socket = new NeverOpeningWebSocket();
  const dependencies = createDependencies();
  dependencies.createWebSocket = vi.fn(() => socket as unknown as WebSocket);

  await expect(
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 10,
      },
      dependencies
    )
  ).rejects.toThrow("Browser DevTools connection did not open within 10ms.");
  expect(socket.close).toHaveBeenCalledOnce();
});

test("retries browser startup before capturing a viewport batch", async () => {
  const failedBrowser = new FakeBrowserProcess();
  const activeBrowser = new FakeBrowserProcess();
  const dependencies = createDependencies();
  vi.mocked(dependencies.spawnBrowser)
    .mockImplementationOnce(() => {
      setTimeout(() => failedBrowser.emit("exit", 21), 0);
      return failedBrowser as never;
    })
    .mockImplementationOnce(() => activeBrowser as never);
  vi.mocked(dependencies.readFile)
    .mockImplementationOnce(async () => await new Promise(() => undefined))
    .mockResolvedValue("9222\n/devtools/browser/1\n");
  dependencies.createWebSocket = vi.fn(
    () => new FakeWebSocket() as unknown as WebSocket
  );
  const options = {
    url: "https://example.com",
    output: "/tmp/current.png",
    width: 800,
    height: 600,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };

  const session = await createBrowserScreenshotSession(options, dependencies);
  await session.capturePage([
    options,
    { ...options, output: "/tmp/mobile.png", width: 375 },
    { ...options, output: "/tmp/tablet.png", width: 768 },
    { ...options, output: "/tmp/desktop.png", width: 1440 },
  ]);
  await session.close();

  expect(dependencies.spawnBrowser).toHaveBeenCalledTimes(2);
  expect(dependencies.writeFile).toHaveBeenCalledTimes(4);
});

test("reports browser startup exit diagnostics without local paths", async () => {
  const dependencies = createDependencies();
  vi.mocked(dependencies.spawnBrowser).mockImplementation(() => {
    const browserProcess = new FakeBrowserProcess();
    setTimeout(() => {
      browserProcess.stderr.emit(
        "socket() failed: Operation not permitted at /Users/example/private?authToken=secret"
      );
      browserProcess.emit("exit", 21);
    }, 0);
    return browserProcess as never;
  });
  vi.mocked(dependencies.readFile).mockImplementation(
    async () => await new Promise(() => undefined)
  );
  const options = {
    url: "https://example.com",
    output: "/tmp/current.png",
    width: 800,
    height: 600,
    browserPath: "/Users/example/Applications/Chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  let startupError: unknown;
  try {
    await createBrowserScreenshotSession(options, dependencies);
  } catch (error) {
    startupError = error;
  }

  expect(startupError).toMatchObject({
    code: "BROWSER_STARTUP_FAILED",
    message:
      "Browser exited before its DevTools endpoint became ready (exit code 21). The operating system denied browser IPC or socket access. Check the browser installation or provide a supported Chromium executable.",
    diagnostic: {
      stage: "browser-startup",
      reason: "browser_ipc_permission_denied",
    },
    issues: [
      {
        code: "browser_ipc_permission_denied",
        path: [],
        constraint: "stage:browser-startup",
      },
    ],
  });
  expect(JSON.stringify(startupError)).not.toContain("/Users/example/private");
  expect(JSON.stringify(startupError)).not.toContain("secret");
});

test("does not restart a browser session after cleanup", async () => {
  const dependencies = createDependencies();
  const options = {
    url: "https://example.com",
    output: "/tmp/closed.png",
    width: 800,
    height: 600,
    browserPath: "/usr/bin/chromium",
    waitUntil: "networkidle" as const,
    waitForTimeout: 0,
    timeout: 1000,
  };
  const session = await createBrowserScreenshotSession(options, dependencies);

  await session.close();

  await expect(session.capture(options)).rejects.toThrow(
    "Browser screenshot session was closed."
  );
  expect(dependencies.spawnBrowser).toHaveBeenCalledOnce();
});

test("captures full page and returns DevTools layout metrics", async () => {
  const browserProcess = new FakeBrowserProcess();
  const socket = new FakeWebSocket();
  const dependencies = createDependencies({ browserProcess, socket });

  const layout = await captureBrowserScreenshot(
    {
      url: "https://example.com",
      output: "/tmp/full-page.png",
      width: 800,
      height: 600,
      fullPage: true,
      includeImageMetrics: true,
      includeResourceMetrics: true,
      includeContrastMetrics: true,
      pageMetadata: {
        rootMarkerAttribute: "data-site",
        idAttribute: "data-site",
        versionAttribute: "data-site-version",
      },
      instanceIdAttribute: "data-instance-id",
      browserPath: "/usr/bin/chromium",
      uid: 1000,
      waitUntil: "networkidle",
      waitForTimeout: 0,
      timeout: 1000,
    },
    dependencies
  );

  expect(layout).toEqual({
    navigation: {
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com",
      status: 200,
      statusText: "OK",
      mimeType: "text/html",
      redirects: [],
      documentReadyState: "complete",
      pageMetadata: {
        rootMarkerPresent: true,
        id: "site",
        version: 2,
      },
      layoutStable: true,
    },
    documentType: "text/html",
    viewportWidth: 800,
    viewportHeight: 600,
    contentWidth: 813,
    contentHeight: 2346,
    horizontalOverflow: false,
    elementGeometry: {
      total: 2,
      sampled: 2,
      truncated: false,
      elements: [
        {
          instanceId: "hero",
          tagName: "section",
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          visible: true,
          clippedX: false,
          clippedY: true,
          overlapsWith: ["overlay"],
        },
        {
          instanceId: "overlay",
          tagName: "div",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          visible: false,
          hiddenReason: "display",
          clippedX: false,
          clippedY: false,
          overlapsWith: [],
        },
      ],
    },
    images: [
      {
        instanceId: "hero-image",
        sourcePathname: "/assets/hero.png",
        loading: "eager",
        complete: true,
        naturalWidth: 2400,
        naturalHeight: 1600,
        selectedSourceWidth: 1200,
        selectedSourceHeight: 800,
        renderedWidth: 600,
        renderedHeight: 400,
        top: 1000,
      },
    ],
    resources: [
      {
        pathname: "/styles.css",
        initiatorType: "link",
        transferSize: 12000,
        encodedBodySize: 11000,
        decodedBodySize: 40000,
        duration: 25,
        renderBlockingStatus: "blocking",
      },
      {
        pathname: "/fonts/brand.ttf",
        initiatorType: "css",
        transferSize: 80000,
        encodedBodySize: 79000,
        decodedBodySize: 79000,
        duration: 40,
      },
    ],
    contrasts: [
      {
        instanceId: "hero-title",
        tagName: "h1",
        foreground: "rgb(120, 120, 120)",
        background: "rgb(255, 255, 255)",
        ratio: 4.42,
        requiredRatio: 4.5,
        fontSize: 16,
        fontWeight: 400,
      },
    ],
    timings: {
      wallMs: expect.any(Number),
      targetSetupMs: expect.any(Number),
      navigationMs: expect.any(Number),
      readinessMs: expect.any(Number),
      imageInspectionMs: expect.any(Number),
      resourceInspectionMs: expect.any(Number),
      screenshotMs: expect.any(Number),
      artifactWriteMs: expect.any(Number),
      targetCleanupMs: expect.any(Number),
    },
  });

  expect(socket.sentMethods).toEqual(
    expect.arrayContaining(["Page.getLayoutMetrics", "Page.captureScreenshot"])
  );
  expect(socket.screenshotStartedBeforeImageInspectionFinished).toBe(true);
  const inspectionExpressions = socket.sentMessages.flatMap((message) =>
    message.method === "Runtime.evaluate" &&
    typeof message.params?.expression === "string" &&
    (message.params.expression.includes("const overlapLimit") ||
      message.params.expression.includes("const parseOpaqueRgb"))
      ? [message.params.expression]
      : []
  );
  expect(inspectionExpressions).toHaveLength(2);
  expect(inspectionExpressions).toEqual([
    expect.stringContaining("CSS.escape(instanceIdAttribute)"),
    expect.stringContaining("CSS.escape(instanceIdAttribute)"),
  ]);
  expect(inspectionExpressions.join("\n")).not.toContain(
    'document.querySelectorAll("*")'
  );
  expect(
    socket.sentMessages.find(
      (message) => message.method === "Page.captureScreenshot"
    )?.params
  ).toEqual({
    format: "png",
    captureBeyondViewport: true,
    optimizeForSpeed: true,
    clip: {
      x: 0,
      y: 0,
      width: 813,
      height: 2346,
      scale: 1,
    },
  });
});

test("returns final URL, redirects, and HTTP error status", async () => {
  const layout = await captureBrowserScreenshot(
    {
      url: "https://example.com/old",
      output: "/tmp/not-found.png",
      width: 800,
      height: 600,
      browserPath: "/usr/bin/chromium",
      waitUntil: "networkidle",
      waitForTimeout: 0,
      timeout: 1000,
    },
    createDependencies({
      socket: new FakeWebSocket(404, "https://example.com/missing"),
    })
  );

  expect(layout.navigation).toEqual({
    requestedUrl: "https://example.com/old",
    finalUrl: "https://example.com/missing",
    status: 404,
    statusText: "Not Found",
    mimeType: "text/html",
    redirects: ["https://example.com/old"],
    documentReadyState: "complete",
    layoutStable: true,
  });
});

test("ignores child-frame document responses when reporting navigation", async () => {
  const layout = await captureBrowserScreenshot(
    {
      url: "https://example.com/page",
      output: "/tmp/page-with-blocked-embed.png",
      width: 800,
      height: 600,
      browserPath: "/usr/bin/chromium",
      waitUntil: "networkidle",
      waitForTimeout: 0,
      timeout: 1000,
    },
    createDependencies({
      socket: new FakeWebSocket(200, undefined, 403),
    })
  );

  expect(layout.navigation).toMatchObject({
    requestedUrl: "https://example.com/page",
    finalUrl: "https://example.com/page",
    status: 200,
    statusText: "OK",
    redirects: [],
  });
});

test("waits for two stable layout samples after a late shift", async () => {
  const layout = await captureBrowserScreenshot(
    {
      url: "https://example.com/page",
      output: "/tmp/page-after-layout-shift.png",
      width: 800,
      height: 600,
      browserPath: "/usr/bin/chromium",
      waitUntil: "networkidle",
      waitForTimeout: 0,
      timeout: 1000,
    },
    createDependencies({
      socket: new FakeWebSocket(200, undefined, undefined, [812, 813, 813]),
    })
  );

  expect(layout.navigation?.layoutStable).toBe(true);
});

test("times out when browser DevTools commands stop responding", async () => {
  const browserProcess = new FakeBrowserProcess();
  const socket = new HangingWebSocket();
  const dependencies = createDependencies({ browserProcess, socket });

  await expect(
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 10,
      },
      dependencies
    )
  ).rejects.toThrow("Browser command Page.enable did not finish within 10ms.");

  expect(browserProcess.kill).toHaveBeenCalled();
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-test", {
    recursive: true,
    force: true,
  });
});

test("rejects after the DevTools socket closes twice", async () => {
  const firstProcess = new FakeBrowserProcess();
  const secondProcess = new FakeBrowserProcess();
  const dependencies = createDependencies();
  vi.mocked(dependencies.spawnBrowser)
    .mockReturnValueOnce(firstProcess as never)
    .mockReturnValueOnce(secondProcess as never);
  vi.mocked(dependencies.createWebSocket)
    .mockImplementationOnce(
      () => new ClosingWebSocket() as unknown as WebSocket
    )
    .mockImplementationOnce(
      () => new ClosingWebSocket() as unknown as WebSocket
    );

  await expect(
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 1000,
      },
      dependencies
    )
  ).rejects.toThrow("Browser DevTools connection closed.");

  expect(dependencies.spawnBrowser).toHaveBeenCalledTimes(2);
  expect(firstProcess.kill).toHaveBeenCalledOnce();
  expect(secondProcess.kill).toHaveBeenCalledOnce();
});

test("times out when browser page target creation does not respond", async () => {
  const browserProcess = new FakeBrowserProcess();
  const dependencies = createDependencies({
    browserProcess,
    fetch: vi.fn(
      async () => await new Promise<Response>(() => undefined)
    ) as unknown as BrowserScreenshotDependencies["fetch"],
  });

  await expect(
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 10,
      },
      dependencies
    )
  ).rejects.toThrow("Browser page target could not be created within 10ms.");

  expect(browserProcess.kill).toHaveBeenCalled();
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-test", {
    recursive: true,
    force: true,
  });
});

test("stops polling when the browser DevTools port is not created", async () => {
  const browserProcess = new FakeBrowserProcess();
  const dependencies = createDependencies({ browserProcess });
  vi.mocked(dependencies.readFile).mockRejectedValue(
    Object.assign(new Error("not ready"), { code: "ENOENT" })
  );

  await expect(
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 10,
      },
      dependencies
    )
  ).rejects.toMatchObject({
    code: "BROWSER_STARTUP_FAILED",
    message: "Browser DevTools endpoint was not created within 10ms.",
  });

  const callsAfterTimeout = vi.mocked(dependencies.readFile).mock.calls.length;
  await new Promise((resolve) => setTimeout(resolve, 75));
  expect(dependencies.readFile).toHaveBeenCalledTimes(callsAfterTimeout);
  expect(browserProcess.kill).toHaveBeenCalled();
});

test("uses a separate browser startup timeout", async () => {
  const browserProcess = new FakeBrowserProcess();
  const dependencies = createDependencies({ browserProcess });
  vi.mocked(dependencies.readFile).mockRejectedValue(
    Object.assign(new Error("not ready"), { code: "ENOENT" })
  );

  await expect(
    createBrowserScreenshotSession(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 100,
        startupTimeout: 5,
      },
      dependencies
    )
  ).rejects.toMatchObject({
    code: "BROWSER_STARTUP_FAILED",
    message: "Browser DevTools endpoint was not created within 5ms.",
  });
});

test("does not wait indefinitely for a failed browser startup to exit", async () => {
  const browserProcess = new FakeBrowserProcess();
  browserProcess.kill.mockImplementation((signal) => {
    if (signal === "SIGKILL") {
      browserProcess.emit("exit", null);
    }
    return true;
  });
  const dependencies = createDependencies({ browserProcess });
  vi.mocked(dependencies.readFile).mockRejectedValue(
    Object.assign(new Error("not ready"), { code: "ENOENT" })
  );

  const result = await Promise.race([
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 10,
      },
      dependencies
    ).then(
      () => "resolved",
      (error: unknown) =>
        error instanceof Error ? error.message : String(error)
    ),
    new Promise<string>((resolve) => {
      setTimeout(() => resolve("startup cleanup hung"), 100).unref();
    }),
  ]);

  expect(result).toContain(
    "Browser DevTools endpoint was not created within 10ms."
  );
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-test", {
    recursive: true,
    force: true,
  });
  expect(browserProcess.kill).toHaveBeenNthCalledWith(1);
  expect(browserProcess.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
});

test("does not wait indefinitely for a page target to close", async () => {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes("/json/new?")) {
      return {
        json: async () => ({
          id: "target-1",
          type: "page",
          webSocketDebuggerUrl: "ws://127.0.0.1:9222/page/created",
        }),
      } as Response;
    }
    return await new Promise<Response>(() => undefined);
  }) as unknown as BrowserScreenshotDependencies["fetch"];
  const dependencies = createDependencies({ fetch });

  const result = await Promise.race([
    captureBrowserScreenshot(
      {
        url: "https://example.com",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "networkidle",
        waitForTimeout: 0,
        timeout: 1000,
      },
      dependencies
    ).then(() => "captured"),
    new Promise<string>((resolve) => {
      setTimeout(() => resolve("target cleanup hung"), 2000).unref();
    }),
  ]);

  expect(result).toBe("captured");
});

test("reports browser navigation errors directly", async () => {
  const browserProcess = new FakeBrowserProcess();
  const socket = new NavigationErrorWebSocket();
  const dependencies = createDependencies({ browserProcess, socket });

  await expect(
    captureBrowserScreenshot(
      {
        url: "invalid-url",
        output: "/tmp/current.png",
        width: 800,
        height: 600,
        browserPath: "/usr/bin/chromium",
        waitUntil: "load",
        waitForTimeout: 0,
        timeout: 1000,
      },
      dependencies
    )
  ).rejects.toThrow(
    "Browser navigation failed: Cannot navigate to invalid URL"
  );

  expect(browserProcess.kill).toHaveBeenCalled();
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/vision-browser-test", {
    recursive: true,
    force: true,
  });
});
