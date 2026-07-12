import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { ScreenshotWaitUntil } from "@webstudio-is/project-build/visual/screenshot-browser";

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

  constructor(socket: WebSocket) {
    this.#socket = socket;
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
    this.#socket.close();
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
  )) as { webSocketDebuggerUrl?: string };
  if (target?.webSocketDebuggerUrl === undefined) {
    throw new Error("Browser did not expose the created page target.");
  }
  return target.webSocketDebuggerUrl;
};

const waitForLifecycleEvent = async (
  cdp: CdpSession,
  waitUntil: ScreenshotWaitUntil,
  timeout: number
) => {
  if (waitUntil === "commit") {
    return;
  }
  const expected = lifecycleEventByWaitUntil[waitUntil];
  await withDeadline(
    new Promise<void>((resolveLifecycle) => {
      const dispose = cdp.on("Page.lifecycleEvent", (params) => {
        if (
          typeof params === "object" &&
          params !== null &&
          "name" in params &&
          params.name === expected
        ) {
          dispose();
          resolveLifecycle();
        }
      });
    }),
    `Page did not reach ${waitUntil}`,
    timeout
  );
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

const waitForFontsAndFrames = async (cdp: CdpSession, timeout: number) => {
  await withDeadline(
    cdp.send("Runtime.evaluate", {
      expression: `
        Promise.resolve(document.fonts?.ready).then(
          () => new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          })
        )
      `,
      awaitPromise: true,
    }),
    "Page fonts and animation frames were not ready",
    timeout
  );
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

export type BrowserScreenshotLayout = {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  horizontalOverflow: boolean;
  images?: BrowserScreenshotImage[];
  resources?: BrowserScreenshotResource[];
};

export type BrowserScreenshotImage = {
  instanceId?: string;
  loading: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
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
    expression: `Array.from(document.images, (image) => {
      const rect = image.getBoundingClientRect();
      return {
        instanceId: image.getAttribute("data-ws-id") || undefined,
        loading: image.loading || "eager",
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        top: rect.top + window.scrollY,
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
        loading: image.loading,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: image.renderedWidth,
        renderedHeight: image.renderedHeight,
        top: image.top,
      },
    ];
  });
};

const getBrowserScreenshotLayout = (
  metrics: BrowserLayoutMetricsResponse,
  viewport: { width: number; height: number },
  images: BrowserScreenshotImage[],
  resources: BrowserScreenshotResource[]
): BrowserScreenshotLayout => {
  const contentWidth = metrics.cssContentSize?.width;
  const contentHeight = metrics.cssContentSize?.height;
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
    viewportWidth: Math.round(viewportWidth),
    viewportHeight: Math.round(viewportHeight),
    contentWidth: Math.ceil(contentWidth),
    contentHeight: Math.ceil(contentHeight),
    horizontalOverflow: contentWidth > viewportWidth + 1,
    images,
    resources,
  };
};

const getScreenshotCaptureParams = async ({
  metrics,
  fullPage,
}: {
  metrics: BrowserLayoutMetricsResponse;
  fullPage?: boolean;
}) => {
  if (fullPage !== true) {
    return {
      format: "png",
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
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x,
      y,
      width: Math.ceil(width),
      height: Math.ceil(height),
      scale: 1,
    },
  };
};

export const captureBrowserScreenshot = async (
  options: BrowserScreenshotOptions,
  dependencies = defaultBrowserScreenshotDependencies
) => {
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
  const browserClosed = new Promise<void>((resolveClosed) => {
    browserProcess.once("exit", () => resolveClosed());
    browserProcess.once("error", () => resolveClosed());
  });
  let cdp: CdpSession | undefined;
  let layout: BrowserScreenshotLayout | undefined;
  try {
    await Promise.race([
      new Promise<never>((_, reject) => {
        browserProcess.once("error", reject);
        browserProcess.once("exit", (code) => {
          reject(
            new Error(
              `Browser exited before screenshot capture completed${
                code === null ? "." : ` with code ${code}.`
              }`
            )
          );
        });
      }),
      (async () => {
        const { port } = await waitForDevToolsPort(
          userDataDir,
          dependencies,
          options.timeout
        );
        const pageWebSocketUrl = await getPageWebSocketUrl({
          port,
          dependencies,
          timeout: options.timeout,
        });
        cdp = await CdpSession.connect(
          pageWebSocketUrl,
          dependencies,
          options.timeout
        );
        const send = async <Result = unknown>(
          method: string,
          params: Record<string, unknown> = {}
        ) =>
          await withDeadline(
            cdp?.send<Result>(method, params) ??
              Promise.reject(new Error("Browser DevTools session is closed.")),
            `Browser command ${method} did not finish`,
            options.timeout
          );
        await Promise.all([
          send("Page.enable"),
          send("Runtime.enable"),
          send("Page.setLifecycleEventsEnabled", { enabled: true }),
          send("Emulation.setDeviceMetricsOverride", {
            width: options.width,
            height: options.height,
            deviceScaleFactor: 1,
            mobile: false,
          }),
        ]);
        const lifecycle = waitForLifecycleEvent(
          cdp,
          options.waitUntil,
          options.timeout
        );
        const navigation = await send<{ errorText?: string }>("Page.navigate", {
          url: options.url,
        });
        if (navigation.errorText !== undefined) {
          throw new Error(`Browser navigation failed: ${navigation.errorText}`);
        }
        await lifecycle;
        if (options.waitForSelector !== undefined) {
          await waitForSelector(cdp, options.waitForSelector, options.timeout);
        }
        await waitForFontsAndFrames(cdp, options.timeout);
        if (options.waitForTimeout > 0) {
          await delay(options.waitForTimeout);
        }
        const metrics = await send<BrowserLayoutMetricsResponse>(
          "Page.getLayoutMetrics"
        );
        const images =
          options.includeImageMetrics === true
            ? await getBrowserScreenshotImages(send)
            : undefined;
        const resources =
          options.includeResourceMetrics === true
            ? await getBrowserScreenshotResources(send)
            : undefined;
        layout = getBrowserScreenshotLayout(
          metrics,
          {
            width: options.width,
            height: options.height,
          },
          images ?? [],
          resources ?? []
        );
        if (images === undefined) {
          delete layout.images;
        }
        if (resources === undefined) {
          delete layout.resources;
        }
        const captureParams = await getScreenshotCaptureParams({
          metrics,
          fullPage: options.fullPage,
        });
        const screenshot = await send<{ data: string }>(
          "Page.captureScreenshot",
          captureParams
        );
        await dependencies.writeFile(
          options.output,
          Buffer.from(screenshot.data, "base64")
        );
      })(),
    ]);
  } finally {
    cdp?.close();
    browserProcess.kill();
    await withDeadline(
      browserClosed,
      "Browser process did not exit after screenshot capture",
      2000
    ).catch(() => undefined);
    await dependencies.rm(userDataDir, { recursive: true, force: true });
  }
  if (layout === undefined) {
    throw new Error("Browser did not report page layout metrics.");
  }
  return layout;
};
