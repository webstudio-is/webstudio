import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { ScreenshotWaitUntil } from "@webstudio-is/project-build/visual";

type BrowserProcess = Pick<ChildProcess, "kill" | "once">;

export type BrowserScreenshotOptions = {
  browserPath: string;
  output: string;
  width: number;
  height: number;
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  url: string;
  uid?: number;
  waitUntil: ScreenshotWaitUntil;
  waitForSelector?: string;
  waitForTimeout: number;
  timeout: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

export type BrowserScreenshotTimings = {
  wallMs: number;
  targetSetupMs: number;
  navigationMs: number;
  readinessMs: number;
  imageInspectionMs: number;
  resourceInspectionMs: number;
  screenshotMs: number;
  artifactWriteMs: number;
  targetCleanupMs: number;
};

export type BrowserScreenshotDependencies = {
  spawnBrowser: (file: string, args: readonly string[]) => BrowserProcess;
  readFile: typeof readFile;
  writeFile: typeof writeFile;
  mkdtemp: typeof mkdtemp;
  rm: typeof rm;
  fetch: typeof fetch;
  createWebSocket: (url: string) => WebSocket;
};

export const defaultBrowserScreenshotDependencies: BrowserScreenshotDependencies =
  {
    spawnBrowser(file, args) {
      return spawn(file, [...args], { stdio: "ignore" });
    },
    readFile,
    writeFile,
    mkdtemp,
    rm,
    fetch,
    createWebSocket(url) {
      return new WebSocket(url);
    },
  };

const lifecycleEventByWaitUntil: Record<ScreenshotWaitUntil, string> = {
  commit: "commit",
  domcontentloaded: "DOMContentLoaded",
  load: "load",
  networkidle: "networkIdle",
};

const delay = (ms: number) =>
  new Promise<void>((resolveDelay) => setTimeout(resolveDelay, ms));

const createTimeoutError = (message: string, timeout: number) =>
  new Error(`${message} within ${timeout}ms.`);

const withDeadline = async <Result>(
  promise: Promise<Result>,
  message: string,
  timeout: number
): Promise<Result> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createTimeoutError(message, timeout));
    }, timeout);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

const measureDuration = async <Result>(operation: () => Promise<Result>) => {
  const startedAt = Date.now();
  const value = await operation();
  return { value, duration: Date.now() - startedAt };
};

type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string };
};

class CdpSession {
  #nextId = 1;
  #callbacks = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  #listeners = new Map<string, Set<(params: unknown) => void>>();

  readonly #socket: WebSocket;
  #closed = false;

  constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#socket.addEventListener("close", () => {
      this.#rejectPending(new Error("Browser DevTools connection closed."));
    });
    this.#socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id !== undefined) {
        const callback = this.#callbacks.get(message.id);
        if (callback === undefined) {
          return;
        }
        this.#callbacks.delete(message.id);
        if (message.error !== undefined) {
          callback.reject(new Error(message.error.message ?? "CDP failed."));
          return;
        }
        callback.resolve(message.result);
        return;
      }
      if (message.method !== undefined) {
        for (const listener of this.#listeners.get(message.method) ?? []) {
          listener(message.params);
        }
      }
    });
  }

  static connect = async (
    url: string,
    dependencies: BrowserScreenshotDependencies,
    timeout: number
  ) => {
    const socket = dependencies.createWebSocket(url);
    await withDeadline(
      new Promise<void>((resolveConnection, rejectConnection) => {
        socket.addEventListener("open", () => resolveConnection(), {
          once: true,
        });
        socket.addEventListener(
          "error",
          () => rejectConnection(new Error("Could not connect to browser.")),
          { once: true }
        );
      }),
      "Browser DevTools connection did not open",
      timeout
    );
    return new CdpSession(socket);
  };

  close = () => {
    this.#rejectPending(new Error("Browser DevTools session was closed."));
    this.#socket.close();
  };

  #rejectPending = (error: Error) => {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    for (const callback of this.#callbacks.values()) {
      callback.reject(error);
    }
    this.#callbacks.clear();
  };

  on = (method: string, listener: (params: unknown) => void) => {
    let listeners = this.#listeners.get(method);
    if (listeners === undefined) {
      listeners = new Set();
      this.#listeners.set(method, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  send = async <Result = unknown>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<Result> => {
    if (this.#closed) {
      throw new Error("Browser DevTools session is closed.");
    }
    const id = this.#nextId;
    this.#nextId += 1;
    const result = new Promise<Result>((resolveSend, rejectSend) => {
      this.#callbacks.set(id, {
        resolve: (value) => resolveSend(value as Result),
        reject: rejectSend,
      });
    });
    this.#socket.send(JSON.stringify({ id, method, params }));
    return await result;
  };
}

const waitForDevToolsPort = async (
  userDataDir: string,
  dependencies: BrowserScreenshotDependencies,
  timeout: number
) =>
  await withDeadline(
    (async () => {
      const portFile = join(userDataDir, "DevToolsActivePort");
      while (true) {
        try {
          const [port, browserPath] = (
            await dependencies.readFile(portFile, "utf8")
          )
            .trim()
            .split(/\r?\n/);
          if (port !== undefined && browserPath !== undefined) {
            return { port, browserPath };
          }
        } catch {
          // Keep polling until Chromium creates DevToolsActivePort.
        }
        await delay(50);
      }
    })(),
    "Browser DevTools endpoint was not created",
    timeout
  );

const getPageWebSocketUrl = async ({
  port,
  dependencies,
  timeout,
}: {
  port: string;
  dependencies: BrowserScreenshotDependencies;
  timeout: number;
}) => {
  const target = (await withDeadline(
    dependencies
      .fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
        method: "PUT",
      })
      .then((response) => response.json()),
    "Browser page target could not be created",
    timeout
  )) as { id?: string; webSocketDebuggerUrl?: string };
  if (target?.webSocketDebuggerUrl === undefined) {
    throw new Error("Browser did not expose the created page target.");
  }
  return {
    id: target.id,
    webSocketDebuggerUrl: target.webSocketDebuggerUrl,
  };
};

type NavigationResult = {
  errorText?: string;
  frameId?: string;
  loaderId?: string;
};

const navigateAndWaitForLifecycle = async (
  cdp: CdpSession,
  waitUntil: ScreenshotWaitUntil,
  timeout: number,
  navigate: () => Promise<NavigationResult>
) => {
  const expected = lifecycleEventByWaitUntil[waitUntil];
  let navigation: NavigationResult | undefined;
  const pendingEvents: unknown[] = [];
  let resolveLifecycle: () => void = () => undefined;
  const lifecycle = new Promise<void>((resolve) => {
    resolveLifecycle = resolve;
  });
  const matchesNavigation = (params: unknown) => {
    if (
      navigation?.frameId === undefined ||
      typeof params !== "object" ||
      params === null ||
      !("name" in params) ||
      params.name !== expected ||
      !("frameId" in params) ||
      params.frameId !== navigation.frameId
    ) {
      return false;
    }
    return (
      navigation.loaderId === undefined ||
      ("loaderId" in params && params.loaderId === navigation.loaderId)
    );
  };
  const dispose = cdp.on("Page.lifecycleEvent", (params) => {
    if (navigation === undefined) {
      pendingEvents.push(params);
      return;
    }
    if (matchesNavigation(params)) {
      resolveLifecycle();
    }
  });
  try {
    navigation = await navigate();
    if (navigation.errorText !== undefined || waitUntil === "commit") {
      return navigation;
    }
    if (pendingEvents.some(matchesNavigation)) {
      resolveLifecycle();
    }
    await withDeadline(lifecycle, `Page did not reach ${waitUntil}`, timeout);
    return navigation;
  } finally {
    dispose();
  }
};

const waitForSelector = async (
  cdp: CdpSession,
  selector: string,
  timeout: number
) => {
  await withDeadline(
    (async () => {
      while (true) {
        const result = await cdp.send<{ result?: { value?: boolean } }>(
          "Runtime.evaluate",
          {
            expression: `document.querySelector(${JSON.stringify(selector)}) !== null`,
            returnByValue: true,
          }
        );
        if (result.result?.value === true) {
          return;
        }
        await delay(100);
      }
    })(),
    `Selector ${selector} was not found`,
    timeout
  );
};

type BrowserReadiness = {
  documentReadyState: string;
  generatedSiteRootPresent: boolean;
  layoutStable: boolean;
};

const waitForFontsAndFrames = async (
  cdp: CdpSession,
  timeout: number
): Promise<BrowserReadiness> => {
  const measure = async () => {
    const response = await withDeadline(
      cdp.send<{ result?: { value?: unknown } }>("Runtime.evaluate", {
        expression: `Promise.resolve(document.fonts?.ready).then(() => ({
          documentReadyState: document.readyState,
          generatedSiteRootPresent:
            document.documentElement.hasAttribute("data-ws-project"),
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        }))`,
        awaitPromise: true,
        returnByValue: true,
      }),
      "Page fonts and layout sample were not ready",
      timeout
    );
    return response.result?.value;
  };
  const isLayoutSample = (
    value: unknown
  ): value is {
    documentReadyState: string;
    generatedSiteRootPresent: boolean;
    width: number;
    height: number;
  } =>
    typeof value === "object" &&
    value !== null &&
    "documentReadyState" in value &&
    typeof value.documentReadyState === "string" &&
    "generatedSiteRootPresent" in value &&
    typeof value.generatedSiteRootPresent === "boolean" &&
    "width" in value &&
    typeof value.width === "number" &&
    "height" in value &&
    typeof value.height === "number";
  const initial = await measure();
  if (isLayoutSample(initial) === false) {
    throw new Error(
      "Browser did not report generated page readiness evidence."
    );
  }
  let before = initial;
  const deadline = Date.now() + timeout;
  while (true) {
    await delay(32);
    const value = await measure();
    if (isLayoutSample(value) === false) {
      throw new Error(
        "Browser did not report generated page readiness evidence."
      );
    }
    if (before.width === value.width && before.height === value.height) {
      return {
        documentReadyState: value.documentReadyState,
        generatedSiteRootPresent: value.generatedSiteRootPresent,
        layoutStable: true,
      };
    }
    if (Date.now() >= deadline) {
      return {
        documentReadyState: value.documentReadyState,
        generatedSiteRootPresent: value.generatedSiteRootPresent,
        layoutStable: false,
      };
    }
    before = value;
  }
};

const createBrowserLaunchArgs = ({
  userDataDir,
  width,
  height,
  uid,
}: {
  userDataDir: string;
  width: number;
  height: number;
  uid?: number;
}) => [
  "--headless=new",
  "--disable-gpu",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--hide-scrollbars",
  "--remote-debugging-port=0",
  `--user-data-dir=${userDataDir}`,
  `--window-size=${width},${height}`,
  "--no-first-run",
  "--no-default-browser-check",
  ...(uid === 0 ? ["--no-sandbox"] : []),
  "about:blank",
];

type BrowserLayoutMetricsResponse = {
  cssContentSize?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  cssLayoutViewport?: {
    clientWidth?: number;
    clientHeight?: number;
  };
};

type BrowserDocumentMetrics = {
  scrollWidth: number;
  scrollHeight: number;
  horizontalOverflowSuppressed: boolean;
  documentType: string;
};

export type BrowserScreenshotLayout = {
  navigation?: BrowserScreenshotNavigation;
  documentType?: string;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  horizontalOverflow: boolean;
  images?: BrowserScreenshotImage[];
  resources?: BrowserScreenshotResource[];
  timings?: BrowserScreenshotTimings;
};

export type BrowserScreenshotNavigation = {
  requestedUrl: string;
  finalUrl: string;
  status?: number;
  statusText?: string;
  mimeType?: string;
  redirects: string[];
  documentReadyState: string;
  generatedSiteRootPresent: boolean;
  layoutStable: boolean;
};

export type BrowserScreenshotImage = {
  instanceId?: string;
  sourcePathname?: string;
  loading: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  selectedSourceWidth?: number;
  selectedSourceHeight?: number;
  renderedWidth: number;
  renderedHeight: number;
  top: number;
};

export type BrowserScreenshotResource = {
  pathname: string;
  initiatorType: string;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  duration: number;
  renderBlockingStatus?: string;
};

const getBrowserScreenshotResources = async (
  send: <Result = unknown>(
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Result>
): Promise<BrowserScreenshotResource[]> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `performance.getEntriesByType("resource").map((entry) => {
      let pathname = "";
      try { pathname = new URL(entry.name).pathname; } catch {}
      return {
        pathname,
        initiatorType: entry.initiatorType || "other",
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        duration: entry.duration || 0,
        renderBlockingStatus: entry.renderBlockingStatus || undefined,
      };
    })`,
    returnByValue: true,
  });
  if (Array.isArray(response.result?.value) === false) {
    return [];
  }
  return response.result.value.flatMap((value) => {
    if (typeof value !== "object" || value === null) {
      return [];
    }
    const resource = value as Record<string, unknown>;
    if (
      typeof resource.pathname !== "string" ||
      typeof resource.initiatorType !== "string" ||
      typeof resource.transferSize !== "number" ||
      typeof resource.encodedBodySize !== "number" ||
      typeof resource.decodedBodySize !== "number" ||
      typeof resource.duration !== "number"
    ) {
      return [];
    }
    return [
      {
        pathname: resource.pathname,
        initiatorType: resource.initiatorType,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize,
        duration: resource.duration,
        ...(typeof resource.renderBlockingStatus === "string"
          ? { renderBlockingStatus: resource.renderBlockingStatus }
          : {}),
      },
    ];
  });
};

const getBrowserScreenshotImages = async (
  send: <Result = unknown>(
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Result>
): Promise<BrowserScreenshotImage[]> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `Promise.all(Array.from(document.images, async (image) => {
      globalThis.__webstudioImageDimensionCache ??= new Map();
      const rect = image.getBoundingClientRect();
      let sourcePathname;
      let selectedSourceWidth;
      let selectedSourceHeight;
      const selectedSource = image.currentSrc || image.src;
      try {
        sourcePathname = selectedSource.startsWith("data:")
          ? selectedSource.slice(0, selectedSource.indexOf(","))
          : new URL(selectedSource, document.baseURI).pathname;
      } catch {}
      try {
        let dimensions = globalThis.__webstudioImageDimensionCache.get(selectedSource);
        if (dimensions === undefined) {
          const response = await fetch(selectedSource);
          const bitmap = await createImageBitmap(await response.blob());
          dimensions = { width: bitmap.width, height: bitmap.height };
          bitmap.close();
          globalThis.__webstudioImageDimensionCache.set(selectedSource, dimensions);
        }
        selectedSourceWidth = dimensions.width;
        selectedSourceHeight = dimensions.height;
      } catch {}
      return {
        instanceId:
          image.getAttribute("data-ws-id") ||
          image.closest("[data-ws-id]")?.getAttribute("data-ws-id") ||
          undefined,
        sourcePathname,
        loading: image.loading || "eager",
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        selectedSourceWidth,
        selectedSourceHeight,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        top: rect.top + window.scrollY,
      };
    }))`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (Array.isArray(response.result?.value) === false) {
    return [];
  }
  return response.result.value.flatMap((value) => {
    if (typeof value !== "object" || value === null) {
      return [];
    }
    const image = value as Record<string, unknown>;
    if (
      typeof image.loading !== "string" ||
      typeof image.complete !== "boolean" ||
      typeof image.naturalWidth !== "number" ||
      typeof image.naturalHeight !== "number" ||
      typeof image.renderedWidth !== "number" ||
      typeof image.renderedHeight !== "number" ||
      typeof image.top !== "number"
    ) {
      return [];
    }
    return [
      {
        ...(typeof image.instanceId === "string"
          ? { instanceId: image.instanceId }
          : {}),
        ...(typeof image.sourcePathname === "string"
          ? { sourcePathname: image.sourcePathname }
          : {}),
        loading: image.loading,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        ...(typeof image.selectedSourceWidth === "number"
          ? { selectedSourceWidth: image.selectedSourceWidth }
          : {}),
        ...(typeof image.selectedSourceHeight === "number"
          ? { selectedSourceHeight: image.selectedSourceHeight }
          : {}),
        renderedWidth: image.renderedWidth,
        renderedHeight: image.renderedHeight,
        top: image.top,
      },
    ];
  });
};

const getBrowserScreenshotLayout = (
  metrics: BrowserLayoutMetricsResponse,
  documentMetrics: BrowserDocumentMetrics,
  viewport: { width: number; height: number },
  images: BrowserScreenshotImage[],
  resources: BrowserScreenshotResource[]
): BrowserScreenshotLayout => {
  const contentWidth = documentMetrics.scrollWidth;
  const contentHeight = documentMetrics.scrollHeight;
  const viewportWidth =
    metrics.cssLayoutViewport?.clientWidth ?? viewport.width;
  const viewportHeight =
    metrics.cssLayoutViewport?.clientHeight ?? viewport.height;
  if (
    typeof contentWidth !== "number" ||
    typeof contentHeight !== "number" ||
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    throw new Error("Browser did not report valid page layout metrics.");
  }
  return {
    documentType: documentMetrics.documentType,
    viewportWidth: Math.round(viewportWidth),
    viewportHeight: Math.round(viewportHeight),
    contentWidth: Math.ceil(contentWidth),
    contentHeight: Math.ceil(contentHeight),
    horizontalOverflow:
      documentMetrics.horizontalOverflowSuppressed === false &&
      contentWidth > viewportWidth + 1,
    images,
    resources,
  };
};

const getBrowserDocumentMetrics = async (
  send: <Result = unknown>(
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Result>
): Promise<BrowserDocumentMetrics> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `({
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth || 0
      ),
      scrollHeight: Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0
      ),
      horizontalOverflowSuppressed: [
        getComputedStyle(document.documentElement).overflowX,
        document.body ? getComputedStyle(document.body).overflowX : "visible",
      ].some((value) => value === "hidden" || value === "clip") ||
        (document.contentType !== "text/html" &&
          document.contentType !== "application/xhtml+xml"),
      documentType: document.contentType || "",
    })`,
    returnByValue: true,
  });
  const value = response.result?.value;
  if (typeof value !== "object" || value === null) {
    throw new Error("Browser did not report valid document metrics.");
  }
  const {
    scrollWidth,
    scrollHeight,
    horizontalOverflowSuppressed,
    documentType,
  } = value as Record<string, unknown>;
  if (
    typeof scrollWidth !== "number" ||
    typeof scrollHeight !== "number" ||
    scrollWidth <= 0 ||
    scrollHeight <= 0 ||
    typeof horizontalOverflowSuppressed !== "boolean" ||
    typeof documentType !== "string"
  ) {
    throw new Error("Browser did not report valid document metrics.");
  }
  return {
    scrollWidth,
    scrollHeight,
    horizontalOverflowSuppressed,
    documentType,
  };
};

const getScreenshotCaptureParams = async ({
  metrics,
  fullPage,
  format = "png",
  quality,
  scale = 1,
}: {
  metrics: BrowserLayoutMetricsResponse;
  fullPage?: boolean;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
}) => {
  const encoding = {
    format,
    ...(format === "png" || quality === undefined ? {} : { quality }),
    optimizeForSpeed: true,
  };
  if (fullPage !== true) {
    return {
      ...encoding,
      captureBeyondViewport: false,
    };
  }
  const { x = 0, y = 0, width, height } = metrics.cssContentSize ?? {};
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Browser did not report a valid full-page content size.");
  }
  return {
    ...encoding,
    captureBeyondViewport: true,
    clip: {
      x,
      y,
      width: Math.ceil(width),
      height: Math.ceil(height),
      scale,
    },
  };
};

class BrowserSessionClosedError extends Error {}

type BrowserRuntime = {
  userDataDir: string;
  browserProcess: BrowserProcess;
  browserClosed: Promise<void>;
  port: string;
  running: boolean;
  close: () => Promise<void>;
};

const startBrowserRuntime = async (
  options: BrowserScreenshotOptions,
  dependencies: BrowserScreenshotDependencies
): Promise<BrowserRuntime> => {
  const userDataDir = await dependencies.mkdtemp(
    join(tmpdir(), "webstudio-browser-")
  );
  const browserProcess = dependencies.spawnBrowser(
    options.browserPath,
    createBrowserLaunchArgs({
      userDataDir,
      width: options.width,
      height: options.height,
      uid: options.uid,
    })
  );
  let running = true;
  const browserClosed = new Promise<void>((resolveClosed) => {
    const close = () => {
      running = false;
      resolveClosed();
    };
    browserProcess.once("exit", close);
    browserProcess.once("error", close);
  });
  try {
    const { port } = await Promise.race([
      waitForDevToolsPort(userDataDir, dependencies, options.timeout),
      browserClosed.then(() => {
        throw new BrowserSessionClosedError(
          "Browser exited before its DevTools endpoint became ready."
        );
      }),
    ]);
    let closePromise: Promise<void> | undefined;
    const runtime: BrowserRuntime = {
      userDataDir,
      browserProcess,
      browserClosed,
      port,
      get running() {
        return running;
      },
      close: async () => {
        closePromise ??= (async () => {
          if (running) {
            browserProcess.kill();
          }
          await withDeadline(
            browserClosed,
            "Browser process did not exit after screenshot capture",
            2000
          ).catch(() => undefined);
          await dependencies.rm(userDataDir, {
            recursive: true,
            force: true,
          });
        })();
        await closePromise;
      },
    };
    return runtime;
  } catch (error) {
    browserProcess.kill();
    await browserClosed;
    await dependencies.rm(userDataDir, { recursive: true, force: true });
    throw error;
  }
};

const capturePageWithBrowserRuntime = async (
  runtime: BrowserRuntime,
  optionsList: readonly BrowserScreenshotOptions[],
  dependencies: BrowserScreenshotDependencies
) => {
  const firstOptions = optionsList[0];
  if (firstOptions === undefined) {
    return [];
  }
  let cdp: CdpSession | undefined;
  let targetId: string | undefined;
  const layouts: BrowserScreenshotLayout[] = [];
  try {
    await Promise.race([
      runtime.browserClosed.then(() => {
        throw new BrowserSessionClosedError(
          "Browser exited before screenshot capture completed."
        );
      }),
      (async () => {
        const setupStartedAt = Date.now();
        const target = await getPageWebSocketUrl({
          port: runtime.port,
          dependencies,
          timeout: firstOptions.timeout,
        });
        targetId = target.id;
        cdp = await CdpSession.connect(
          target.webSocketDebuggerUrl,
          dependencies,
          firstOptions.timeout
        );
        const send = async <Result = unknown>(
          method: string,
          params: Record<string, unknown> = {},
          timeout = firstOptions.timeout
        ) =>
          await withDeadline(
            cdp?.send<Result>(method, params) ??
              Promise.reject(new Error("Browser DevTools session is closed.")),
            `Browser command ${method} did not finish`,
            timeout
          );
        const redirectsByFrame = new Map<string, string[]>();
        const documentResponsesByFrame = new Map<
          string,
          {
            url: string;
            status: number;
            statusText?: string;
            mimeType?: string;
          }
        >();
        cdp.on("Network.requestWillBeSent", (params) => {
          if (
            typeof params !== "object" ||
            params === null ||
            !("type" in params) ||
            params.type !== "Document" ||
            !("redirectResponse" in params) ||
            typeof params.redirectResponse !== "object" ||
            params.redirectResponse === null ||
            !("url" in params.redirectResponse) ||
            typeof params.redirectResponse.url !== "string" ||
            !("frameId" in params) ||
            typeof params.frameId !== "string"
          ) {
            return;
          }
          const redirects = redirectsByFrame.get(params.frameId) ?? [];
          redirects.push(params.redirectResponse.url);
          redirectsByFrame.set(params.frameId, redirects);
        });
        cdp.on("Network.responseReceived", (params) => {
          if (
            typeof params !== "object" ||
            params === null ||
            !("type" in params) ||
            params.type !== "Document" ||
            !("frameId" in params) ||
            typeof params.frameId !== "string" ||
            !("response" in params) ||
            typeof params.response !== "object" ||
            params.response === null
          ) {
            return;
          }
          const response = params.response as Record<string, unknown>;
          if (
            typeof response.url !== "string" ||
            typeof response.status !== "number"
          ) {
            return;
          }
          documentResponsesByFrame.set(params.frameId, {
            url: response.url,
            status: response.status,
            ...(typeof response.statusText === "string"
              ? { statusText: response.statusText }
              : {}),
            ...(typeof response.mimeType === "string"
              ? { mimeType: response.mimeType }
              : {}),
          });
        });
        await Promise.all([
          send("Page.enable"),
          send("Network.enable"),
          send("Runtime.enable"),
          send("Page.setLifecycleEventsEnabled", { enabled: true }),
        ]);
        const targetSetupMs = Date.now() - setupStartedAt;
        let navigationFrameId: string | undefined;
        let previousUrl: string | undefined;
        for (const [index, options] of optionsList.entries()) {
          const viewportStartedAt = Date.now();
          await send(
            "Emulation.setDeviceMetricsOverride",
            {
              width: options.width,
              height: options.height,
              deviceScaleFactor: 1,
              mobile: false,
            },
            options.timeout
          );
          let navigationMs = 0;
          if (options.url !== previousUrl) {
            redirectsByFrame.clear();
            documentResponsesByFrame.clear();
            const navigationStartedAt = Date.now();
            const navigation = await navigateAndWaitForLifecycle(
              cdp,
              options.waitUntil,
              options.timeout,
              async () =>
                await send<NavigationResult>(
                  "Page.navigate",
                  { url: options.url },
                  options.timeout
                )
            );
            if (navigation.errorText !== undefined) {
              throw new Error(
                `Browser navigation failed: ${navigation.errorText}`
              );
            }
            navigationFrameId = navigation.frameId;
            navigationMs = Date.now() - navigationStartedAt;
            previousUrl = options.url;
          } else {
            await send(
              "Runtime.evaluate",
              {
                expression:
                  "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
                awaitPromise: true,
              },
              options.timeout
            );
          }
          const readinessStartedAt = Date.now();
          if (options.waitForSelector !== undefined) {
            await waitForSelector(
              cdp,
              options.waitForSelector,
              options.timeout
            );
          }
          const readiness = await waitForFontsAndFrames(cdp, options.timeout);
          if (options.waitForTimeout > 0) {
            await delay(options.waitForTimeout);
          }
          const readinessMs = Date.now() - readinessStartedAt;
          const locationPromise = send<{
            result?: { value?: unknown };
          }>(
            "Runtime.evaluate",
            {
              expression: "window.location.href",
              returnByValue: true,
            },
            options.timeout
          );
          const metricsPromise = send<BrowserLayoutMetricsResponse>(
            "Page.getLayoutMetrics",
            {},
            options.timeout
          );
          const documentMetricsPromise = getBrowserDocumentMetrics(send);
          const imageInspectionPromise = measureDuration(async () =>
            options.includeImageMetrics === true
              ? await getBrowserScreenshotImages(send)
              : undefined
          );
          const resourceInspectionPromise = measureDuration(async () =>
            options.includeResourceMetrics === true
              ? await getBrowserScreenshotResources(send)
              : undefined
          );
          const screenshotPromise = (async () => {
            const metrics = await metricsPromise;
            const captureParams = await getScreenshotCaptureParams({
              metrics,
              fullPage: options.fullPage,
              format: options.format,
              quality: options.quality,
              scale: options.scale,
            });
            const screenshot = await measureDuration(async () =>
              send<{ data: string }>(
                "Page.captureScreenshot",
                captureParams,
                options.timeout
              )
            );
            const artifactWrite = await measureDuration(async () =>
              dependencies.writeFile(
                options.output,
                Buffer.from(screenshot.value.data, "base64")
              )
            );
            return {
              screenshotMs: screenshot.duration,
              artifactWriteMs: artifactWrite.duration,
            };
          })();
          const [
            locationResult,
            metrics,
            documentMetrics,
            imageInspection,
            resourceInspection,
            screenshot,
          ] = await Promise.all([
            locationPromise,
            metricsPromise,
            documentMetricsPromise,
            imageInspectionPromise,
            resourceInspectionPromise,
            screenshotPromise,
          ]);
          const finalUrl =
            typeof locationResult.result?.value === "string"
              ? locationResult.result.value
              : ((navigationFrameId === undefined
                  ? undefined
                  : documentResponsesByFrame.get(navigationFrameId)?.url) ??
                options.url);
          const documentResponse =
            navigationFrameId === undefined
              ? undefined
              : documentResponsesByFrame.get(navigationFrameId);
          const redirects =
            navigationFrameId === undefined
              ? []
              : (redirectsByFrame.get(navigationFrameId) ?? []);
          const images = imageInspection.value;
          const resources = resourceInspection.value;
          const layout = getBrowserScreenshotLayout(
            metrics,
            documentMetrics,
            { width: options.width, height: options.height },
            images ?? [],
            resources ?? []
          );
          layout.navigation = {
            requestedUrl: options.url,
            finalUrl,
            ...(documentResponse === undefined
              ? {}
              : {
                  status: documentResponse.status,
                  ...(documentResponse.statusText === undefined
                    ? {}
                    : { statusText: documentResponse.statusText }),
                  ...(documentResponse.mimeType === undefined
                    ? {}
                    : { mimeType: documentResponse.mimeType }),
                }),
            redirects,
            ...readiness,
          };
          if (images === undefined) {
            delete layout.images;
          }
          if (resources === undefined) {
            delete layout.resources;
          }
          layout.timings = {
            wallMs: Date.now() - viewportStartedAt,
            targetSetupMs: index === 0 ? targetSetupMs : 0,
            navigationMs,
            readinessMs,
            imageInspectionMs: imageInspection.duration,
            resourceInspectionMs: resourceInspection.duration,
            screenshotMs: screenshot.screenshotMs,
            artifactWriteMs: screenshot.artifactWriteMs,
            targetCleanupMs: 0,
          };
          layouts.push(layout);
        }
      })(),
    ]);
  } finally {
    const cleanupStartedAt = Date.now();
    cdp?.close();
    if (targetId !== undefined && runtime.running) {
      await dependencies
        .fetch(`http://127.0.0.1:${runtime.port}/json/close/${targetId}`)
        .catch(() => undefined);
    }
    const lastLayout = layouts.at(-1);
    if (lastLayout?.timings !== undefined) {
      lastLayout.timings.targetCleanupMs = Date.now() - cleanupStartedAt;
    }
  }
  if (layouts.length !== optionsList.length) {
    throw new Error("Browser did not report page layout metrics.");
  }
  return layouts;
};

const captureWithBrowserRuntime = async (
  runtime: BrowserRuntime,
  options: BrowserScreenshotOptions,
  dependencies: BrowserScreenshotDependencies
) => {
  const [layout] = await capturePageWithBrowserRuntime(
    runtime,
    [options],
    dependencies
  );
  if (layout === undefined) {
    throw new Error("Browser did not report page layout metrics.");
  }
  return layout;
};

export type BrowserScreenshotSession = {
  capture: (
    options: BrowserScreenshotOptions
  ) => Promise<BrowserScreenshotLayout>;
  capturePage: (
    options: readonly BrowserScreenshotOptions[]
  ) => Promise<BrowserScreenshotLayout[]>;
  close: () => Promise<void>;
};

export const createBrowserScreenshotSession = async (
  options: BrowserScreenshotOptions,
  dependencies = defaultBrowserScreenshotDependencies
): Promise<BrowserScreenshotSession> => {
  let runtime = await startBrowserRuntime(options, dependencies);
  let restartPromise: Promise<BrowserRuntime> | undefined;
  const restart = async (failedRuntime: BrowserRuntime) => {
    if (runtime !== failedRuntime) {
      return runtime;
    }
    restartPromise ??= (async () => {
      await failedRuntime.close();
      const next = await startBrowserRuntime(options, dependencies);
      runtime = next;
      restartPromise = undefined;
      return next;
    })();
    return await restartPromise;
  };
  const captureWithRestart = async <Result>(
    capture: (activeRuntime: BrowserRuntime) => Promise<Result>
  ) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const activeRuntime = runtime;
      try {
        return await capture(activeRuntime);
      } catch (error) {
        if (
          attempt === 1 ||
          (error instanceof BrowserSessionClosedError === false &&
            activeRuntime.running)
        ) {
          throw error;
        }
        await restart(activeRuntime);
      }
    }
    throw new Error("Browser screenshot retry was exhausted.");
  };
  return {
    async capture(captureOptions) {
      return await captureWithRestart(
        async (activeRuntime) =>
          await captureWithBrowserRuntime(
            activeRuntime,
            captureOptions,
            dependencies
          )
      );
    },
    async capturePage(captureOptions) {
      return await captureWithRestart(
        async (activeRuntime) =>
          await capturePageWithBrowserRuntime(
            activeRuntime,
            captureOptions,
            dependencies
          )
      );
    },
    async close() {
      await runtime.close();
    },
  };
};

export const captureBrowserScreenshot = async (
  options: BrowserScreenshotOptions,
  dependencies = defaultBrowserScreenshotDependencies
) => {
  const session = await createBrowserScreenshotSession(options, dependencies);
  try {
    return await session.capture(options);
  } finally {
    await session.close();
  }
};
