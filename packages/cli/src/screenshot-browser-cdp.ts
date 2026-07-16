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
  includeContrastMetrics?: boolean;
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
) => {
  const portFile = join(userDataDir, "DevToolsActivePort");
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
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
      // Chromium creates DevToolsActivePort asynchronously.
    }
    await delay(Math.min(50, Math.max(0, deadline - Date.now())));
  }
  throw createTimeoutError(
    "Browser DevTools endpoint was not created",
    timeout
  );
};

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
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await withDeadline(
      cdp.send<{ result?: { value?: boolean } }>("Runtime.evaluate", {
        expression: `document.querySelector(${JSON.stringify(selector)}) !== null`,
        returnByValue: true,
      }),
      `Selector ${selector} was not found`,
      Math.max(1, deadline - Date.now())
    );
    if (result.result?.value === true) {
      return;
    }
    await delay(Math.min(100, Math.max(0, deadline - Date.now())));
  }
  throw createTimeoutError(`Selector ${selector} was not found`, timeout);
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
  elementGeometry?: BrowserScreenshotElementGeometry;
  images?: BrowserScreenshotImage[];
  resources?: BrowserScreenshotResource[];
  contrasts?: BrowserScreenshotContrast[];
  timings?: BrowserScreenshotTimings;
};

export type BrowserScreenshotElement = {
  instanceId: string;
  tagName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  hiddenReason?: "display" | "visibility" | "opacity" | "hidden";
  clippedX: boolean;
  clippedY: boolean;
  overlapsWith: string[];
};

export type BrowserScreenshotElementGeometry = {
  total: number;
  sampled: number;
  truncated: boolean;
  elements: BrowserScreenshotElement[];
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

export type BrowserScreenshotContrast = {
  instanceId: string;
  tagName: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: 3 | 4.5;
  fontSize: number;
  fontWeight: number;
};

const maxBrowserScreenshotElements = 250;
const maxBrowserScreenshotOverlapsPerElement = 5;

const getBrowserScreenshotElementGeometry = async (
  send: <Result = unknown>(
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Result>
): Promise<BrowserScreenshotElementGeometry> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `(() => {
      const limit = ${maxBrowserScreenshotElements};
      const overlapLimit = ${maxBrowserScreenshotOverlapsPerElement};
      const candidates = Array.from(document.querySelectorAll("[data-ws-id]"));
      const elements = candidates.slice(0, limit).map((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        let hiddenReason;
        if (element.hidden) hiddenReason = "hidden";
        else if (style.display === "none") hiddenReason = "display";
        else if (style.visibility === "hidden" || style.visibility === "collapse") hiddenReason = "visibility";
        else if (Number(style.opacity) === 0) hiddenReason = "opacity";
        const visible = hiddenReason === undefined && rect.width > 0 && rect.height > 0;
        const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
        const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
        return {
          element,
          instanceId: element.getAttribute("data-ws-id"),
          tagName: element.tagName.toLowerCase(),
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          visible,
          hiddenReason,
          clippedX: visible && clipsX && element.scrollWidth > element.clientWidth + 1,
          clippedY: visible && clipsY && element.scrollHeight > element.clientHeight + 1,
          overlapsWith: [],
        };
      }).filter((item) => item.instanceId !== null);
      const visible = elements.filter((item) => item.visible);
      for (let leftIndex = 0; leftIndex < visible.length; leftIndex += 1) {
        const left = visible[leftIndex];
        const leftRect = left.element.getBoundingClientRect();
        for (let rightIndex = leftIndex + 1; rightIndex < visible.length; rightIndex += 1) {
          const right = visible[rightIndex];
          if (left.overlapsWith.length >= overlapLimit && right.overlapsWith.length >= overlapLimit) continue;
          if (left.element.contains(right.element) || right.element.contains(left.element)) continue;
          const rightRect = right.element.getBoundingClientRect();
          const intersectionWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
          const intersectionHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
          if (intersectionWidth <= 1 || intersectionHeight <= 1) continue;
          if (left.overlapsWith.length < overlapLimit) left.overlapsWith.push(right.instanceId);
          if (right.overlapsWith.length < overlapLimit) right.overlapsWith.push(left.instanceId);
        }
      }
      return {
        total: candidates.length,
        sampled: elements.length,
        truncated: candidates.length > limit,
        elements: elements.map(({ element: _element, ...item }) => item),
      };
    })()`,
    returnByValue: true,
  });
  const value = response.result?.value;
  if (typeof value !== "object" || value === null) {
    return { total: 0, sampled: 0, truncated: false, elements: [] };
  }
  const geometry = value as Record<string, unknown>;
  if (
    typeof geometry.total !== "number" ||
    typeof geometry.sampled !== "number" ||
    typeof geometry.truncated !== "boolean" ||
    Array.isArray(geometry.elements) === false
  ) {
    return { total: 0, sampled: 0, truncated: false, elements: [] };
  }
  const elements = geometry.elements.flatMap((value) => {
    if (typeof value !== "object" || value === null) {
      return [];
    }
    const element = value as Record<string, unknown>;
    if (
      typeof element.instanceId !== "string" ||
      typeof element.tagName !== "string" ||
      typeof element.x !== "number" ||
      typeof element.y !== "number" ||
      typeof element.width !== "number" ||
      typeof element.height !== "number" ||
      typeof element.visible !== "boolean" ||
      typeof element.clippedX !== "boolean" ||
      typeof element.clippedY !== "boolean" ||
      Array.isArray(element.overlapsWith) === false ||
      element.overlapsWith.some((id) => typeof id !== "string")
    ) {
      return [];
    }
    const hiddenReason: BrowserScreenshotElement["hiddenReason"] =
      element.hiddenReason === "display" ||
      element.hiddenReason === "visibility" ||
      element.hiddenReason === "opacity" ||
      element.hiddenReason === "hidden"
        ? element.hiddenReason
        : undefined;
    const overlapsWith = (element.overlapsWith as unknown[])
      .filter((id): id is string => typeof id === "string")
      .slice(0, maxBrowserScreenshotOverlapsPerElement);
    return [
      {
        instanceId: element.instanceId,
        tagName: element.tagName,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        visible: element.visible,
        ...(hiddenReason === undefined ? {} : { hiddenReason }),
        clippedX: element.clippedX,
        clippedY: element.clippedY,
        overlapsWith,
      },
    ];
  });
  return {
    total: Math.max(0, Math.round(geometry.total)),
    sampled: elements.length,
    truncated: geometry.truncated,
    elements,
  };
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

const getBrowserScreenshotContrasts = async (
  send: <Result = unknown>(
    method: string,
    params?: Record<string, unknown>
  ) => Promise<Result>
): Promise<BrowserScreenshotContrast[]> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `(() => {
      const limit = ${maxBrowserScreenshotElements};
      const parseOpaqueRgb = (value) => {
        const match = value.match(/^rgba?\\(\\s*(\\d+(?:\\.\\d+)?)\\D+(\\d+(?:\\.\\d+)?)\\D+(\\d+(?:\\.\\d+)?)(?:\\D+(\\d+(?:\\.\\d+)?))?\\s*\\)$/i);
        if (match === null || (match[4] !== undefined && Number(match[4]) !== 1)) return undefined;
        return [Number(match[1]), Number(match[2]), Number(match[3])];
      };
      const luminance = (rgb) => {
        const channels = rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const candidates = Array.from(document.querySelectorAll("[data-ws-id]"))
        .filter((element) => Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ""))
        .slice(0, limit);
      return candidates.flatMap((element) => {
        if (element.closest(":disabled,[aria-disabled='true']") !== null) return [];
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility !== "visible") return [];
        const foreground = parseOpaqueRgb(style.color);
        if (foreground === undefined || style.textShadow !== "none" || style.webkitBackgroundClip === "text") return [];
        const ancestors = [];
        let current = element;
        let background;
        while (current instanceof Element) {
          ancestors.push(current);
          const currentStyle = getComputedStyle(current);
          const before = getComputedStyle(current, "::before");
          const after = getComputedStyle(current, "::after");
          if (
            Number(currentStyle.opacity) !== 1 ||
            currentStyle.backgroundImage !== "none" ||
            currentStyle.mixBlendMode !== "normal" ||
            currentStyle.filter !== "none" ||
            currentStyle.backdropFilter !== "none" ||
            (before.content !== "none" && before.content !== "normal") ||
            (after.content !== "none" && after.content !== "normal")
          ) return [];
          const color = parseOpaqueRgb(currentStyle.backgroundColor);
          if (color !== undefined) {
            background = { rgb: color, value: currentStyle.backgroundColor, element: current };
            break;
          }
          if (currentStyle.backgroundColor !== "rgba(0, 0, 0, 0)" && currentStyle.backgroundColor !== "transparent") return [];
          current = current.parentElement;
        }
        if (background === undefined) return [];
        const range = document.createRange();
        const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "");
        if (textNode === undefined) return [];
        range.selectNodeContents(textNode);
        const textRect = range.getBoundingClientRect();
        if (
          textRect.width <= 0 ||
          textRect.height <= 0 ||
          textRect.right <= 0 ||
          textRect.bottom <= 0 ||
          textRect.left >= window.innerWidth ||
          textRect.top >= window.innerHeight
        ) return [];
        const x = Math.min(window.innerWidth - 1, Math.max(0, textRect.left + textRect.width / 2));
        const y = Math.min(window.innerHeight - 1, Math.max(0, textRect.top + textRect.height / 2));
        const stack = document.elementsFromPoint(x, y);
        const backgroundIndex = stack.indexOf(background.element);
        if (backgroundIndex < 0 || stack.slice(0, backgroundIndex).some((candidate) => !element.contains(candidate) && !candidate.contains(element))) return [];
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(background.rgb);
        const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
        const fontSize = Number.parseFloat(style.fontSize);
        const parsedWeight = Number.parseInt(style.fontWeight, 10);
        const fontWeight = Number.isFinite(parsedWeight) ? parsedWeight : style.fontWeight === "bold" ? 700 : 400;
        const requiredRatio = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
        return [{
          instanceId: element.getAttribute("data-ws-id"),
          tagName: element.tagName.toLowerCase(),
          foreground: style.color,
          background: background.value,
          ratio,
          requiredRatio,
          fontSize,
          fontWeight,
        }];
      });
    })()`,
    returnByValue: true,
  });
  if (Array.isArray(response.result?.value) === false) {
    return [];
  }
  return response.result.value.flatMap((value) => {
    if (typeof value !== "object" || value === null) {
      return [];
    }
    const contrast = value as Record<string, unknown>;
    if (
      typeof contrast.instanceId !== "string" ||
      typeof contrast.tagName !== "string" ||
      typeof contrast.foreground !== "string" ||
      typeof contrast.background !== "string" ||
      typeof contrast.ratio !== "number" ||
      (contrast.requiredRatio !== 3 && contrast.requiredRatio !== 4.5) ||
      typeof contrast.fontSize !== "number" ||
      typeof contrast.fontWeight !== "number"
    ) {
      return [];
    }
    return [contrast as BrowserScreenshotContrast];
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
  elementGeometry: BrowserScreenshotElementGeometry,
  images: BrowserScreenshotImage[],
  resources: BrowserScreenshotResource[],
  contrasts: BrowserScreenshotContrast[]
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
    elementGeometry,
    images,
    resources,
    contrasts,
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
          const elementGeometryPromise =
            getBrowserScreenshotElementGeometry(send);
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
          const contrastInspectionPromise = measureDuration(async () =>
            options.includeContrastMetrics === true
              ? await getBrowserScreenshotContrasts(send)
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
            elementGeometry,
            imageInspection,
            resourceInspection,
            contrastInspection,
            screenshot,
          ] = await Promise.all([
            locationPromise,
            metricsPromise,
            documentMetricsPromise,
            elementGeometryPromise,
            imageInspectionPromise,
            resourceInspectionPromise,
            contrastInspectionPromise,
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
          const contrasts = contrastInspection.value;
          const layout = getBrowserScreenshotLayout(
            metrics,
            documentMetrics,
            { width: options.width, height: options.height },
            elementGeometry,
            images ?? [],
            resources ?? [],
            contrasts ?? []
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
          if (contrasts === undefined) {
            delete layout.contrasts;
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
