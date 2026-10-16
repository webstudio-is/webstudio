import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { ScreenshotWaitUntil } from "./screenshot-browser";

const withTimeout = async <Result>(
  operation: Promise<Result>,
  timeout: number,
  createTimeoutError: () => Error
) => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError()), timeout);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

type BrowserProcess = Pick<ChildProcess, "kill" | "once"> & {
  stderr?: Pick<NodeJS.ReadableStream, "on"> | null;
};

export type BrowserScreenshotPageMetadata = {
  rootMarkerPresent: boolean;
  id?: string;
  version?: number;
};

export type BrowserScreenshotOptions = {
  browserPath: string;
  output: string;
  width: number;
  height: number;
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  includeContrastMetrics?: boolean;
  includeElementGeometry?: boolean;
  pageMetadata?: {
    rootMarkerAttribute: string;
    idAttribute?: string;
    versionAttribute?: string;
  };
  instanceIdAttribute?: string;
  url: string;
  httpCredentials?: { username: string; password: string };
  uid?: number;
  disableSandbox?: boolean;
  waitUntil: ScreenshotWaitUntil;
  prepareExpression?: string;
  waitForSelector?: string;
  failForSelector?: string;
  waitForFonts?: boolean;
  waitForTimeout: number;
  finalizeExpression?: string;
  timeout: number;
  startupTimeout?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

export type BrowserFormValue = {
  name: string;
  value?: string;
  file?: { name: string; base64: string; type?: string };
};

export type BrowserFormSubmitOptions = {
  url: string;
  selector: string;
  values: readonly BrowserFormValue[];
  submitter?: string;
  timeout: number;
};

export type BrowserFormSubmitResult = {
  status: "validation_failed" | "submitted" | "unknown";
  formState?: string;
  results: readonly {
    status: number;
    resourceId?: string;
    resourceName?: string;
  }[];
  errors: readonly { status?: number; name?: string; message: string }[];
  exchanges: readonly { status: number; url: string }[];
  pageUrl: string;
  redirect?: string;
  correlationId: string;
};

const getNavigationUrl = (options: BrowserScreenshotOptions) => {
  if (options.httpCredentials === undefined) {
    return options.url;
  }
  const url = new URL(options.url);
  url.username = options.httpCredentials.username;
  url.password = options.httpCredentials.password;
  return url.toString();
};

const removeUrlCredentials = (value: string) => {
  try {
    const url = new URL(value);
    if (url.username === "" && url.password === "") {
      return value;
    }
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return value;
  }
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
      return spawn(file, [...args], { stdio: ["ignore", "ignore", "pipe"] });
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
  Object.assign(new Error(`${message} within ${timeout}ms.`), {
    code: "SCREENSHOT_TIMEOUT",
  });

const withDeadline = async <Result>(
  promise: Promise<Result>,
  message: string,
  timeout: number
): Promise<Result> =>
  await withTimeout(promise, timeout, () =>
    createTimeoutError(message, timeout)
  );

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

export type BrowserStartupDiagnostic = {
  stage: "browser-startup";
  reason: "browser_ipc_permission_denied";
  message: string;
};

type BrowserProcessExit = { code?: number; signal?: string };
type BrowserDiagnosticIssue = {
  code: string;
  path: string[];
  message: string;
  constraint: string;
};

export class BrowserSessionClosedError extends Error {
  readonly code = "BROWSER_SESSION_CLOSED";
  readonly diagnostic?: BrowserStartupDiagnostic;
  processExit?: BrowserProcessExit;
  readonly issues?: BrowserDiagnosticIssue[];

  constructor(
    message: string,
    diagnostic?: BrowserStartupDiagnostic,
    processExit?: BrowserProcessExit,
    issues?: BrowserSessionClosedError["issues"]
  ) {
    super(message);
    this.diagnostic = diagnostic;
    this.processExit = processExit;
    this.issues = issues;
  }
}

export const isBrowserSessionClosedError = (
  error: unknown
): error is BrowserSessionClosedError =>
  error instanceof Error &&
  "code" in error &&
  error.code === "BROWSER_SESSION_CLOSED";

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
      this.#rejectPending(
        new BrowserSessionClosedError(
          "Browser DevTools connection closed.",
          undefined,
          undefined,
          [
            {
              code: "browser_devtools_connection_closed",
              path: [],
              message: "The browser DevTools connection closed during capture.",
              constraint: "devtools_connection_available",
            },
          ]
        )
      );
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
    try {
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
    } catch (error) {
      try {
        socket.close();
      } catch {
        // Preserve the connection failure when a pending socket cannot close.
      }
      throw error;
    }
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

const getExecutionContextId = (params: unknown) =>
  typeof params === "object" &&
  params !== null &&
  "executionContextId" in params &&
  typeof params.executionContextId === "number"
    ? params.executionContextId
    : undefined;

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
    if (
      navigation.errorText !== undefined ||
      navigation.loaderId === undefined ||
      waitUntil === "commit"
    ) {
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
        expression: `document.querySelector(${JSON.stringify(
          selector
        )}) !== null`,
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

const getSelectorText = async (cdp: CdpSession, selector: string) => {
  const result = await cdp.send<{ result?: { value?: unknown } }>(
    "Runtime.evaluate",
    {
      expression: `document.querySelector(${JSON.stringify(
        selector
      )})?.textContent`,
      returnByValue: true,
    }
  );
  return typeof result.result?.value === "string"
    ? result.result.value.trim()
    : undefined;
};

type BrowserReadiness = {
  documentReadyState: string;
  pageMetadata?: BrowserScreenshotPageMetadata;
  layoutStable: boolean;
};

const waitForFontsAndFrames = async (
  cdp: CdpSession,
  timeout: number,
  {
    pageMetadata,
    waitForFonts = true,
  }: Pick<BrowserScreenshotOptions, "pageMetadata" | "waitForFonts">
): Promise<BrowserReadiness> => {
  const measure = async () => {
    let response: { result?: { value?: unknown } };
    try {
      response = await withDeadline(
        cdp.send<{ result?: { value?: unknown } }>("Runtime.evaluate", {
          expression: `Promise.resolve(${
            waitForFonts ? "document.fonts?.ready" : "undefined"
          }).then(() => {
          const metadata = ${JSON.stringify(pageMetadata)};
          const root = document.documentElement;
          const id = metadata?.idAttribute === undefined
            ? undefined
            : root.getAttribute(metadata.idAttribute) ?? undefined;
          const versionAttribute = metadata?.versionAttribute === undefined
            ? undefined
            : root.getAttribute(metadata.versionAttribute);
          const version = versionAttribute === undefined || versionAttribute === null
            ? undefined
            : Number(versionAttribute);
          return {
            documentReadyState: document.readyState,
            pageMetadata: metadata === undefined
              ? undefined
              : {
                  rootMarkerPresent: root.hasAttribute(metadata.rootMarkerAttribute),
                  id,
                  version: Number.isFinite(version) ? version : undefined,
                },
            width: root.scrollWidth,
            height: root.scrollHeight,
          };
        })`,
          awaitPromise: true,
          returnByValue: true,
        }),
        waitForFonts
          ? "Page fonts and layout sample were not ready"
          : "Page layout sample was not ready",
        timeout
      );
    } catch (error) {
      if (
        !waitForFonts ||
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "SCREENSHOT_TIMEOUT"
      ) {
        throw error;
      }
      let loadingFonts: unknown;
      try {
        const diagnostic = await withDeadline(
          cdp.send<{ result?: { value?: unknown } }>("Runtime.evaluate", {
            expression:
              'Array.from(document.fonts).filter((font) => font.status === "loading").map((font) => font.family).slice(0, 5)',
            returnByValue: true,
          }),
          "Font diagnostic was not ready",
          Math.min(timeout, 500)
        );
        loadingFonts = diagnostic.result?.value;
      } catch {
        // Preserve the original timeout when diagnostics are unavailable.
      }
      const names = Array.isArray(loadingFonts)
        ? loadingFonts.filter(
            (name): name is string => typeof name === "string"
          )
        : [];
      throw createTimeoutError(
        `Page fonts and layout sample were not ready${
          names.length > 0 ? `; loading fonts: ${names.join(", ")}` : ""
        }`,
        timeout
      );
    }
    return response.result?.value;
  };
  const isLayoutSample = (
    value: unknown
  ): value is {
    documentReadyState: string;
    pageMetadata?: BrowserScreenshotPageMetadata;
    width: number;
    height: number;
  } =>
    typeof value === "object" &&
    value !== null &&
    "documentReadyState" in value &&
    typeof value.documentReadyState === "string" &&
    ("pageMetadata" in value === false ||
      value.pageMetadata === undefined ||
      (typeof value.pageMetadata === "object" &&
        value.pageMetadata !== null &&
        "rootMarkerPresent" in value.pageMetadata &&
        typeof value.pageMetadata.rootMarkerPresent === "boolean" &&
        ("id" in value.pageMetadata === false ||
          value.pageMetadata.id === undefined ||
          typeof value.pageMetadata.id === "string") &&
        ("version" in value.pageMetadata === false ||
          value.pageMetadata.version === undefined ||
          typeof value.pageMetadata.version === "number"))) &&
    "width" in value &&
    typeof value.width === "number" &&
    "height" in value &&
    typeof value.height === "number";
  const initial = await measure();
  if (isLayoutSample(initial) === false) {
    throw new Error("Browser did not report page readiness evidence.");
  }
  let before = initial;
  const deadline = Date.now() + timeout;
  while (true) {
    await delay(32);
    const value = await measure();
    if (isLayoutSample(value) === false) {
      throw new Error("Browser did not report page readiness evidence.");
    }
    if (before.width === value.width && before.height === value.height) {
      return {
        documentReadyState: value.documentReadyState,
        ...(value.pageMetadata === undefined
          ? {}
          : { pageMetadata: value.pageMetadata }),
        layoutStable: true,
      };
    }
    if (Date.now() >= deadline) {
      return {
        documentReadyState: value.documentReadyState,
        ...(value.pageMetadata === undefined
          ? {}
          : { pageMetadata: value.pageMetadata }),
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
  disableSandbox,
}: {
  userDataDir: string;
  width: number;
  height: number;
  uid?: number;
  disableSandbox?: boolean;
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
  ...(uid === 0 || disableSandbox === true ? ["--no-sandbox"] : []),
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
  javascriptErrorPresent?: boolean;
  pageMetadata?: BrowserScreenshotPageMetadata;
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
  ) => Promise<Result>,
  instanceIdAttribute: string
): Promise<BrowserScreenshotElementGeometry> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `(() => {
      const limit = ${maxBrowserScreenshotElements};
      const overlapLimit = ${maxBrowserScreenshotOverlapsPerElement};
      const instanceIdAttribute = ${JSON.stringify(instanceIdAttribute)};
      const instanceSelector = "[" + CSS.escape(instanceIdAttribute) + "]";
      const candidates = Array.from(document.querySelectorAll(instanceSelector));
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
          instanceId: element.getAttribute(instanceIdAttribute),
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
  ) => Promise<Result>,
  instanceIdAttribute: string
): Promise<BrowserScreenshotContrast[]> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `(() => {
      const limit = ${maxBrowserScreenshotElements};
      const instanceIdAttribute = ${JSON.stringify(instanceIdAttribute)};
      const instanceSelector = "[" + CSS.escape(instanceIdAttribute) + "]";
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
      const candidates = Array.from(document.querySelectorAll(instanceSelector))
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
          instanceId: element.getAttribute(instanceIdAttribute),
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
  ) => Promise<Result>,
  instanceIdAttribute: string
): Promise<BrowserScreenshotImage[]> => {
  const response = await send<{
    result?: { value?: unknown };
  }>("Runtime.evaluate", {
    expression: `Promise.all(Array.from(document.images, async (image) => {
      globalThis.__visionImageDimensionCache ??= new Map();
      const instanceIdAttribute = ${JSON.stringify(instanceIdAttribute)};
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
        let dimensions = globalThis.__visionImageDimensionCache.get(selectedSource);
        if (dimensions === undefined) {
          const response = await fetch(selectedSource);
          const bitmap = await createImageBitmap(await response.blob());
          dimensions = { width: bitmap.width, height: bitmap.height };
          bitmap.close();
          globalThis.__visionImageDimensionCache.set(selectedSource, dimensions);
        }
        selectedSourceWidth = dimensions.width;
        selectedSourceHeight = dimensions.height;
      } catch {}
      let identifiedElement = image;
      while (identifiedElement !== null && identifiedElement.hasAttribute(instanceIdAttribute) === false) {
        identifiedElement = identifiedElement.parentElement;
      }
      return {
        instanceId: identifiedElement?.getAttribute(instanceIdAttribute) || undefined,
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

export class BrowserStartupError extends Error {
  readonly code = "BROWSER_STARTUP_FAILED";
  readonly diagnostic?: BrowserStartupDiagnostic;
  readonly processExit?: BrowserProcessExit;
  readonly issues?: BrowserDiagnosticIssue[];

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      diagnostic?: BrowserStartupDiagnostic;
      processExit?: BrowserProcessExit;
    }
  ) {
    super(message, options);
    this.name = "BrowserStartupError";
    this.diagnostic = options?.diagnostic;
    this.processExit = options?.processExit;
    this.issues =
      options?.diagnostic === undefined
        ? undefined
        : [
            {
              code: options.diagnostic.reason,
              path: [],
              message: options.diagnostic.message,
              constraint: `stage:${options.diagnostic.stage}`,
            },
          ];
  }
}

const getBrowserStartupDiagnostic = (
  output: string
): BrowserStartupDiagnostic | undefined => {
  if (
    /(?:socket\(\)|ipc|mach port|bootstrap_check_in).*?(?:operation not permitted|permission denied)|(?:operation not permitted|permission denied).*?(?:socket|ipc|mach port)/i.test(
      output
    )
  ) {
    return {
      stage: "browser-startup",
      reason: "browser_ipc_permission_denied",
      message: "The operating system denied browser IPC or socket access.",
    };
  }
};

const getBrowserExitMessage = (
  message: string,
  reason?: string,
  diagnostic?: BrowserStartupDiagnostic
) =>
  `${message}${reason === undefined ? "" : ` (${reason})`}.${
    diagnostic === undefined ? "" : ` ${diagnostic.message}`
  } Check the browser installation or provide a supported Chromium executable.`;

type BrowserRuntime = {
  userDataDir: string;
  browserProcess: BrowserProcess;
  browserClosed: Promise<string | undefined>;
  port: string;
  running: boolean;
  processExit?: BrowserProcessExit;
  close: () => Promise<void>;
};

const stopBrowserProcess = async ({
  browserProcess,
  browserClosed,
  running,
  gracePeriodMs,
}: {
  browserProcess: BrowserProcess;
  browserClosed: Promise<string | undefined>;
  running: boolean;
  gracePeriodMs: number;
}) => {
  if (running === false) {
    return;
  }
  browserProcess.kill();
  try {
    await withDeadline(
      browserClosed,
      "Browser process did not exit after termination",
      gracePeriodMs
    );
    return;
  } catch {
    browserProcess.kill("SIGKILL");
  }
  await withDeadline(
    browserClosed,
    "Browser process did not exit after forced termination",
    2000
  ).catch(() => undefined);
};

const removeBrowserProfile = async (
  userDataDir: string,
  dependencies: Pick<BrowserScreenshotDependencies, "rm">
) => {
  try {
    await dependencies.rm(userDataDir, { recursive: true, force: true });
  } catch {
    await dependencies
      .rm(userDataDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 50,
      })
      .catch(() => undefined);
  }
};

const startBrowserRuntimeOnce = async (
  options: BrowserScreenshotOptions,
  dependencies: BrowserScreenshotDependencies
): Promise<BrowserRuntime> => {
  const startupTimeout = options.startupTimeout ?? options.timeout;
  const userDataDir = await dependencies.mkdtemp(
    join(tmpdir(), "vision-browser-")
  );
  let browserProcess: BrowserProcess;
  try {
    browserProcess = dependencies.spawnBrowser(
      options.browserPath,
      createBrowserLaunchArgs({
        userDataDir,
        width: options.width,
        height: options.height,
        uid: options.uid,
        disableSandbox: options.disableSandbox,
      })
    );
  } catch (error) {
    await removeBrowserProfile(userDataDir, dependencies);
    throw error;
  }
  let startupOutput = "";
  let collectStartupOutput = true;
  browserProcess.stderr?.on("data", (chunk) => {
    if (collectStartupOutput) {
      startupOutput = `${startupOutput}${String(chunk)}`.slice(-4000);
    }
  });
  let running = true;
  let processExit: BrowserProcessExit | undefined;
  const browserClosed = new Promise<string | undefined>((resolveClosed) => {
    const close = (reason?: string) => {
      running = false;
      resolveClosed(reason);
    };
    browserProcess.once("exit", (code, signal) => {
      processExit = {
        ...(typeof code === "number" ? { code } : {}),
        ...(typeof signal === "string" ? { signal } : {}),
      };
      close(
        typeof code === "number"
          ? `exit code ${code}`
          : typeof signal === "string"
            ? `signal ${signal}`
            : undefined
      );
    });
    browserProcess.once("error", (error) => {
      const code = "code" in error ? error.code : undefined;
      close(code === undefined ? undefined : `spawn error ${code}`);
    });
  });
  try {
    const { port } = await Promise.race([
      waitForDevToolsPort(userDataDir, dependencies, startupTimeout),
      browserClosed.then((reason) => {
        const diagnostic = getBrowserStartupDiagnostic(startupOutput);
        throw new BrowserSessionClosedError(
          getBrowserExitMessage(
            "Browser exited before its DevTools endpoint became ready",
            reason,
            diagnostic
          ),
          diagnostic,
          processExit
        );
      }),
    ]);
    collectStartupOutput = false;
    startupOutput = "";
    let closePromise: Promise<void> | undefined;
    const runtime: BrowserRuntime = {
      userDataDir,
      browserProcess,
      browserClosed,
      port,
      get running() {
        return running;
      },
      get processExit() {
        return processExit;
      },
      close: async () => {
        closePromise ??= (async () => {
          await stopBrowserProcess({
            browserProcess,
            browserClosed,
            running,
            gracePeriodMs: 2000,
          });
          await removeBrowserProfile(userDataDir, dependencies);
        })();
        await closePromise;
      },
    };
    return runtime;
  } catch (error) {
    await stopBrowserProcess({
      browserProcess,
      browserClosed,
      running,
      gracePeriodMs: Math.min(startupTimeout, 2000),
    });
    await removeBrowserProfile(userDataDir, dependencies);
    throw error;
  }
};

const startBrowserRuntime = async (
  options: BrowserScreenshotOptions,
  dependencies: BrowserScreenshotDependencies
) => {
  try {
    return await startBrowserRuntimeOnce(options, dependencies);
  } catch (error) {
    if (error instanceof BrowserSessionClosedError === false) {
      throw new BrowserStartupError(
        error instanceof Error ? error.message : String(error),
        { cause: error }
      );
    }
  }
  try {
    return await startBrowserRuntimeOnce(options, dependencies);
  } catch (error) {
    throw new BrowserStartupError(
      error instanceof Error ? error.message : String(error),
      {
        cause: error,
        diagnostic:
          error instanceof BrowserSessionClosedError
            ? error.diagnostic
            : undefined,
        processExit:
          error instanceof BrowserSessionClosedError
            ? error.processExit
            : undefined,
      }
    );
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
      runtime.browserClosed.then((reason) => {
        throw new BrowserSessionClosedError(
          getBrowserExitMessage(
            "Browser exited before screenshot capture completed",
            reason
          )
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
        let javascriptErrorPresent = false;
        let navigationFrameId: string | undefined;
        let navigationExecutionContextFrames: Map<number, string> | undefined;
        let navigationJavascriptErrorContextIds = new Set<number>();
        let activeExecutionContextIds = new Set<number>();
        const recordJavascriptError = (params: unknown) => {
          const executionContextId = getExecutionContextId(params);
          if (executionContextId === undefined) {
            return;
          }
          if (navigationExecutionContextFrames !== undefined) {
            navigationJavascriptErrorContextIds.add(executionContextId);
          } else if (activeExecutionContextIds.has(executionContextId)) {
            javascriptErrorPresent = true;
          }
        };
        cdp.on("Runtime.executionContextCreated", (params) => {
          const context = (
            params as {
              context?: {
                id: number;
                auxData?: { frameId?: string; isDefault?: boolean };
              };
            } | null
          )?.context;
          if (context?.auxData?.isDefault !== true) {
            return;
          }
          const { id, auxData } = context;
          const { frameId } = auxData;
          if (typeof frameId !== "string") {
            return;
          }
          if (navigationExecutionContextFrames !== undefined) {
            navigationExecutionContextFrames.set(id, frameId);
          } else if (frameId === navigationFrameId) {
            activeExecutionContextIds.add(id);
          }
        });
        cdp.on("Runtime.exceptionThrown", (params) => {
          if (
            typeof params === "object" &&
            params !== null &&
            "exceptionDetails" in params
          ) {
            recordJavascriptError(params.exceptionDetails);
          }
        });
        cdp.on("Runtime.consoleAPICalled", (params) => {
          if (
            typeof params === "object" &&
            params !== null &&
            "type" in params &&
            params.type === "error"
          ) {
            recordJavascriptError(params);
          }
        });
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
          redirects.push(removeUrlCredentials(params.redirectResponse.url));
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
            url: removeUrlCredentials(response.url),
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
          send("Emulation.setFocusEmulationEnabled", { enabled: true }),
          send("Page.setLifecycleEventsEnabled", { enabled: true }),
        ]);
        const targetSetupMs = Date.now() - setupStartedAt;
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
            const previousNavigationFrameId = navigationFrameId;
            const previousExecutionContextIds = new Set(
              activeExecutionContextIds
            );
            javascriptErrorPresent = false;
            navigationExecutionContextFrames = new Map();
            navigationJavascriptErrorContextIds.clear();
            activeExecutionContextIds = new Set();
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
                  { url: getNavigationUrl(options) },
                  options.timeout
                )
            );
            if (navigation.errorText !== undefined) {
              throw new Error(
                `Browser navigation failed: ${navigation.errorText}`
              );
            }
            const sameDocumentNavigation =
              navigation.loaderId === undefined &&
              navigation.frameId !== undefined &&
              navigation.frameId === previousNavigationFrameId;
            navigationFrameId = navigation.frameId;
            if (sameDocumentNavigation) {
              for (const executionContextId of previousExecutionContextIds) {
                activeExecutionContextIds.add(executionContextId);
              }
            }
            for (const [
              executionContextId,
              frameId,
            ] of navigationExecutionContextFrames ?? []) {
              if (frameId === navigationFrameId) {
                activeExecutionContextIds.add(executionContextId);
              }
            }
            for (const executionContextId of activeExecutionContextIds) {
              if (navigationJavascriptErrorContextIds.has(executionContextId)) {
                javascriptErrorPresent = true;
                break;
              }
            }
            navigationExecutionContextFrames = undefined;
            navigationJavascriptErrorContextIds.clear();
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
          if (options.prepareExpression !== undefined) {
            try {
              await send(
                "Runtime.evaluate",
                {
                  expression: options.prepareExpression,
                  awaitPromise: true,
                },
                options.timeout
              );
            } catch (cause) {
              throw new Error(
                `Screenshot target preparation failed: ${options.url}\nOutput: ${options.output}`,
                { cause }
              );
            }
          }
          const readinessStartedAt = Date.now();
          if (options.waitForSelector !== undefined) {
            try {
              await waitForSelector(
                cdp,
                options.waitForSelector,
                options.timeout
              );
            } catch (cause) {
              throw new Error(
                `Screenshot target did not become ready: ${options.url}\nOutput: ${options.output}`,
                { cause }
              );
            }
          }
          if (options.failForSelector !== undefined) {
            const failure = await getSelectorText(cdp, options.failForSelector);
            if (failure !== undefined) {
              throw new Error(
                `Screenshot target reported an error: ${failure}\nTarget: ${options.url}`
              );
            }
          }
          const readiness = await waitForFontsAndFrames(
            cdp,
            options.timeout,
            options
          );
          if (options.waitForTimeout > 0) {
            await delay(options.waitForTimeout);
          }
          if (options.finalizeExpression !== undefined) {
            try {
              await send(
                "Runtime.evaluate",
                {
                  expression: options.finalizeExpression,
                  awaitPromise: true,
                },
                options.timeout
              );
            } catch (cause) {
              throw new Error(
                `Screenshot target finalization failed: ${options.url}\nOutput: ${options.output}`,
                { cause }
              );
            }
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
            options.includeElementGeometry === false
              ? Promise.resolve({
                  total: 0,
                  sampled: 0,
                  truncated: false,
                  elements: [],
                })
              : getBrowserScreenshotElementGeometry(
                  send,
                  options.instanceIdAttribute ?? "id"
                );
          const imageInspectionPromise = measureDuration(async () =>
            options.includeImageMetrics === true
              ? await getBrowserScreenshotImages(
                  send,
                  options.instanceIdAttribute ?? "id"
                )
              : undefined
          );
          const resourceInspectionPromise = measureDuration(async () =>
            options.includeResourceMetrics === true
              ? await getBrowserScreenshotResources(send)
              : undefined
          );
          const contrastInspectionPromise = measureDuration(async () =>
            options.includeContrastMetrics === true
              ? await getBrowserScreenshotContrasts(
                  send,
                  options.instanceIdAttribute ?? "id"
                )
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
          const finalUrl = removeUrlCredentials(
            typeof locationResult.result?.value === "string"
              ? locationResult.result.value
              : ((navigationFrameId === undefined
                  ? undefined
                  : documentResponsesByFrame.get(navigationFrameId)?.url) ??
                  options.url)
          );
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
            ...(javascriptErrorPresent ? { javascriptErrorPresent: true } : {}),
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
          if (options.includeElementGeometry === false) {
            delete layout.elementGeometry;
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
      await withDeadline(
        dependencies.fetch(
          `http://127.0.0.1:${runtime.port}/json/close/${targetId}`
        ),
        "Browser page target did not close",
        Math.min(firstOptions.timeout, 100)
      ).catch(() => undefined);
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

export const isRenderedFormReady = (selector: string) => {
  const form = document.querySelector(selector);
  return (
    form instanceof HTMLFormElement &&
    form.querySelector(":scope > fieldset[disabled]") === null &&
    // Generated pages are server rendered. Native requestSubmit before React
    // attaches its props can silently bypass the managed Form handler.
    Object.getOwnPropertyNames(form).some((key) =>
      key.startsWith("__reactProps$")
    )
  );
};

export const submitRenderedForm = (input: BrowserFormSubmitOptions) => {
  // A generated page can redirect during navigation. Check in the same browser
  // evaluation that fills the controls so supplied values stay on this Preview.
  if (window.location.origin !== new URL(input.url).origin) {
    return { status: "off_origin" };
  }
  if (document.querySelector("[data-ws-project]") === null) {
    throw new Error("This route did not render a generated Webstudio site.");
  }
  const form = document.querySelector(input.selector);
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Generated Preview Form was not found.");
  }
  const byName = new Map<string, BrowserFormValue[]>();
  for (const item of input.values) {
    const items = byName.get(item.name) ?? [];
    items.push(item);
    byName.set(item.name, items);
  }
  for (const [name, items] of byName) {
    const controls = Array.from(form.elements).filter(
      (element) =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement) &&
        element.name === name
    ) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    if (controls.length === 0) {
      throw new Error("Form field " + name + " was not found.");
    }
    const files = items.filter((item) => item.file !== undefined);
    if (files.length > 0) {
      const control = controls.find(
        (item) => item instanceof HTMLInputElement && item.type === "file"
      );
      if (!(control instanceof HTMLInputElement)) {
        throw new Error("File field " + name + " was not found.");
      }
      const transfer = new DataTransfer();
      for (const item of files) {
        const file = item.file;
        if (file === undefined) {
          continue;
        }
        const bytes = Uint8Array.from(atob(file.base64), (char) =>
          char.charCodeAt(0)
        );
        transfer.items.add(new File([bytes], file.name, { type: file.type }));
      }
      control.files = transfer.files;
      control.dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }
    if (
      controls[0] instanceof HTMLInputElement &&
      (controls[0].type === "checkbox" || controls[0].type === "radio")
    ) {
      const selected = new Set(items.map((item) => item.value));
      for (const control of controls) {
        if (control instanceof HTMLInputElement) {
          const shouldCheck = selected.has(control.value);
          if (
            (control.type === "radio" && shouldCheck && !control.checked) ||
            (control.type === "checkbox" && control.checked !== shouldCheck)
          ) {
            // A real click updates checked and fires React's checkbox/radio
            // change handler through its delegated click listener.
            control.click();
          }
        }
      }
      continue;
    }
    if (controls[0] instanceof HTMLSelectElement && controls[0].multiple) {
      const selected = new Set(items.map((item) => item.value));
      for (const option of controls[0].options) {
        option.selected = selected.has(option.value);
      }
      controls[0].dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }
    items.forEach((item, index) => {
      const control = controls[index];
      if (control === undefined) {
        throw new Error("Not enough controls for " + name + ".");
      }
      if (control instanceof HTMLSelectElement) {
        control.value = item.value ?? "";
        control.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        // React tracks value on the element itself. The native setter lets its
        // delegated input handler observe the change when the event bubbles.
        const prototype =
          control instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (setter === undefined) {
          throw new Error("Form field cannot accept a value.");
        }
        setter.call(control, item.value ?? "");
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }
  const submitter =
    input.submitter === undefined
      ? undefined
      : form.querySelector(input.submitter);
  if (
    input.submitter !== undefined &&
    !(
      submitter instanceof HTMLButtonElement ||
      (submitter instanceof HTMLInputElement && submitter.type === "submit")
    )
  ) {
    throw new Error("Form submitter was not found.");
  }
  if (
    !form.noValidate &&
    !(
      submitter instanceof HTMLElement &&
      "formNoValidate" in submitter &&
      submitter.formNoValidate
    ) &&
    !form.checkValidity()
  ) {
    return {
      status: "validation_failed",
      errors: (
        Array.from(form.elements).filter(
          (element) =>
            (element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement ||
              element instanceof HTMLSelectElement) &&
            !element.validity.valid
        ) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ).map((element) => {
        const validity = element.validity;
        return {
          name: element.name,
          message: validity.valueMissing
            ? "A value is required."
            : validity.typeMismatch
              ? "Enter a valid value for this field."
              : validity.patternMismatch
                ? "Value does not match the required pattern."
                : validity.tooLong
                  ? "Value is too long."
                  : validity.tooShort
                    ? "Value is too short."
                    : validity.rangeUnderflow
                      ? "Value is below the allowed range."
                      : validity.rangeOverflow
                        ? "Value is above the allowed range."
                        : validity.stepMismatch
                          ? "Value does not match the required step."
                          : validity.badInput
                            ? "Enter a valid value for this field."
                            : "This field is invalid.",
        };
      }),
    };
  }
  const preSubmitFormState = form.getAttribute("data-state");
  form.requestSubmit(
    submitter as HTMLButtonElement | HTMLInputElement | undefined
  );
  return { status: "dispatched", errors: [], preSubmitFormState };
};

const submitFormWithBrowserRuntime = async (
  runtime: BrowserRuntime,
  options: BrowserFormSubmitOptions,
  dependencies: BrowserScreenshotDependencies
): Promise<BrowserFormSubmitResult> => {
  const correlationId = crypto.randomUUID();
  const deadline = Date.now() + options.timeout;
  const remaining = () => {
    const duration = deadline - Date.now();
    if (duration <= 0) {
      throw createTimeoutError(
        "Preview Form submission did not finish",
        options.timeout
      );
    }
    return duration;
  };
  let cdp: CdpSession | undefined;
  let targetId: string | undefined;
  let initialPageUrl = options.url;
  const exchanges: { status: number; url: string }[] = [];
  let managedResponseId: string | undefined;
  const submissionRequestIds = new Set<string>();
  const completedRequestIds = new Set<string>();
  let navigationObserved = false;
  let mainFrameId: string | undefined;
  let sawPending = false;
  const redactUrl = (value: string) => {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "[non-http URL]";
    }
    return `${url.origin}${url.pathname}`;
  };
  const unknown = (): BrowserFormSubmitResult => ({
    status: "unknown",
    formState: "unknown",
    results: [],
    errors: [],
    exchanges,
    pageUrl: redactUrl(initialPageUrl),
    correlationId,
  });
  let dispatchStarted = false;
  try {
    const target = await getPageWebSocketUrl({
      port: runtime.port,
      dependencies,
      timeout: remaining(),
    });
    targetId = target.id;
    cdp = await CdpSession.connect(
      target.webSocketDebuggerUrl,
      dependencies,
      remaining()
    );
    const send = async <Result = unknown>(
      method: string,
      params: Record<string, unknown> = {}
    ) => {
      const timeout = remaining();
      return await withDeadline(
        cdp?.send<Result>(method, params) ??
          Promise.reject(new Error("Browser DevTools session is closed.")),
        `Browser command ${method} did not finish`,
        timeout
      );
    };
    cdp.on("Network.requestWillBeSent", (params) => {
      if (
        dispatchStarted &&
        typeof params === "object" &&
        params !== null &&
        "requestId" in params &&
        typeof params.requestId === "string" &&
        "request" in params &&
        typeof params.request === "object" &&
        params.request !== null &&
        "method" in params.request &&
        params.request.method === "POST"
      ) {
        submissionRequestIds.add(params.requestId);
      }
    });
    for (const event of [
      "Page.navigatedWithinDocument",
      "Page.frameNavigated",
    ]) {
      cdp.on(event, (params) => {
        if (
          !dispatchStarted ||
          mainFrameId === undefined ||
          typeof params !== "object" ||
          params === null
        ) {
          return;
        }
        const frameId =
          event === "Page.navigatedWithinDocument"
            ? "frameId" in params
              ? params.frameId
              : undefined
            : "frame" in params &&
                typeof params.frame === "object" &&
                params.frame !== null &&
                "id" in params.frame
              ? params.frame.id
              : undefined;
        if (frameId === mainFrameId) {
          navigationObserved = true;
        }
      });
    }
    cdp.on("Network.loadingFinished", (params) => {
      if (
        typeof params === "object" &&
        params !== null &&
        "requestId" in params &&
        typeof params.requestId === "string" &&
        submissionRequestIds.has(params.requestId)
      ) {
        completedRequestIds.add(params.requestId);
      }
    });
    cdp.on("Network.responseReceived", (params) => {
      if (
        dispatchStarted &&
        typeof params === "object" &&
        params !== null &&
        "type" in params &&
        ["XHR", "Fetch", "Document"].includes(String(params.type)) &&
        "response" in params &&
        typeof params.response === "object" &&
        params.response !== null &&
        "status" in params.response &&
        typeof params.response.status === "number" &&
        "url" in params.response &&
        typeof params.response.url === "string"
      ) {
        exchanges.push({
          status: params.response.status,
          url: redactUrl(params.response.url),
        });
        if (
          "requestId" in params &&
          typeof params.requestId === "string" &&
          new URL(params.response.url).pathname.startsWith("/__ws-form")
        ) {
          managedResponseId = params.requestId;
        }
      }
    });
    await Promise.all([
      send("Page.enable"),
      send("Runtime.enable"),
      send("Network.enable", {
        enableDurableMessages: true,
        maxTotalBufferSize: 4_000_000,
        maxResourceBufferSize: 1_000_000,
      }),
      send("Page.setLifecycleEventsEnabled", { enabled: true }),
    ]);
    const navigation = await navigateAndWaitForLifecycle(
      cdp,
      "load",
      remaining(),
      () => send<NavigationResult>("Page.navigate", { url: options.url })
    );
    if (navigation.errorText !== undefined) {
      throw new Error(`Browser navigation failed: ${navigation.errorText}`);
    }
    mainFrameId = navigation.frameId;
    // The generated route may canonicalize during initial navigation.
    // Capture that location before the only requestSubmit call.
    while (true) {
      const readiness = await send<{
        result?: { value?: { ready?: boolean; pageUrl?: string } };
      }>("Runtime.evaluate", {
        expression: `({ready: (${isRenderedFormReady})(${JSON.stringify(
          options.selector
        )}), pageUrl: window.location.href})`,
        returnByValue: true,
      });
      initialPageUrl = readiness.result?.value?.pageUrl ?? initialPageUrl;
      if (readiness.result?.value?.ready === true) {
        break;
      }
      await delay(Math.min(50, remaining()));
    }
    const expression = `(${submitRenderedForm})(${JSON.stringify(options)})`;
    // There is deliberately one requestSubmit call and no browser reconnect or retry here.
    dispatchStarted = true;
    const evaluated = await send<{
      result?: {
        value?: {
          status?: string;
          errors?: { name: string; message: string }[];
          preSubmitFormState?: string | null;
        };
      };
      exceptionDetails?: unknown;
    }>("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluated.exceptionDetails !== undefined) {
      throw new Error("Browser could not prepare the generated Preview Form.");
    }
    const value = evaluated.result?.value;
    if (value?.status === "off_origin") {
      dispatchStarted = false;
      throw new Error("Generated Preview navigated to another origin.");
    }
    if (value?.status === "validation_failed") {
      return {
        status: "validation_failed",
        formState: "invalid",
        results: [],
        errors: value.errors ?? [],
        exchanges: [],
        pageUrl: redactUrl(initialPageUrl),
        correlationId,
      };
    }
    if (value?.status !== "dispatched") {
      return unknown();
    }
    let pageUrl = redactUrl(initialPageUrl);
    let formState = "unknown";
    let didNavigate = false;
    let lastBusy = false;
    let terminalTransition = false;
    while (Date.now() < deadline) {
      await delay(Math.min(100, remaining()));
      const observed = await send<{
        result?: {
          value?: {
            pageUrl?: string;
            formState?: string | null;
            busy?: boolean;
          };
        };
      }>("Runtime.evaluate", {
        expression: `({pageUrl: window.location.href, formState: document.querySelector(${JSON.stringify(
          options.selector
        )})?.getAttribute("data-state"), busy: document.querySelector(${JSON.stringify(
          options.selector
        )})?.getAttribute("aria-busy") === "true"})`,
        returnByValue: true,
      });
      const current = observed.result?.value;
      pageUrl = redactUrl(current?.pageUrl ?? initialPageUrl);
      didNavigate =
        current?.pageUrl !== undefined && current.pageUrl !== initialPageUrl;
      formState = current?.formState ?? "unknown";
      terminalTransition =
        (formState === "success" || formState === "error") &&
        formState !== value.preSubmitFormState;
      lastBusy = current?.busy === true;
      sawPending ||= current?.busy === true;
      const requestCompleted = completedRequestIds.size > 0;
      const pendingFinished = sawPending && current?.busy === false;
      if (
        ((didNavigate || navigationObserved) && !lastBusy) ||
        ((requestCompleted || pendingFinished || terminalTransition) &&
          current?.busy === false &&
          (formState === "success" || formState === "error"))
      ) {
        break;
      }
    }
    const results: {
      status: number;
      resourceId?: string;
      resourceName?: string;
    }[] = [];
    const errors: { status?: number; name?: string; message: string }[] = [];
    if (managedResponseId !== undefined && Date.now() < deadline) {
      const body = await send<{ body?: string; base64Encoded?: boolean }>(
        "Network.getResponseBody",
        { requestId: managedResponseId }
      ).catch(() => undefined);
      if (body?.body !== undefined && body.body.length < 1_000_000) {
        try {
          const parsed: unknown = JSON.parse(
            body.base64Encoded
              ? Buffer.from(body.body, "base64").toString("utf8")
              : body.body
          );
          if (typeof parsed === "object" && parsed !== null) {
            const response = parsed as Record<string, unknown>;
            if (Array.isArray(response.results)) {
              for (const item of response.results.slice(0, 100)) {
                if (
                  typeof item === "object" &&
                  item !== null &&
                  typeof item.status === "number"
                ) {
                  results.push({
                    status: item.status,
                    ...(typeof item.resourceId === "string"
                      ? { resourceId: item.resourceId }
                      : {}),
                    ...(typeof item.resourceName === "string"
                      ? { resourceName: item.resourceName }
                      : {}),
                  });
                }
              }
            }
            if (Array.isArray(response.errors)) {
              for (const item of response.errors.slice(0, 100)) {
                if (typeof item === "object" && item !== null) {
                  errors.push({
                    ...(typeof item.status === "number"
                      ? { status: item.status }
                      : {}),
                    ...(typeof item.resourceName === "string"
                      ? { name: item.resourceName }
                      : {}),
                    message:
                      typeof item.status === "number"
                        ? `Form resource returned HTTP ${item.status}`
                        : "Form resource failed",
                  });
                }
              }
            }
          }
        } catch {
          // An unreadable response leaves the outcome based on rendered state.
        }
      }
    }
    return {
      status:
        ((didNavigate || navigationObserved) && !lastBusy) ||
        ((completedRequestIds.size > 0 || sawPending || terminalTransition) &&
          !lastBusy &&
          (formState === "success" || formState === "error"))
          ? "submitted"
          : "unknown",
      formState,
      results,
      errors,
      exchanges,
      pageUrl,
      ...(didNavigate ? { redirect: pageUrl } : {}),
      correlationId,
    };
  } catch (error) {
    if (dispatchStarted) {
      return unknown();
    }
    throw error;
  } finally {
    cdp?.close();
    if (targetId !== undefined && runtime.running) {
      await dependencies
        .fetch(`http://127.0.0.1:${runtime.port}/json/close/${targetId}`)
        .catch(() => undefined);
    }
  }
};

export type BrowserScreenshotSession = {
  submitForm?: (
    options: BrowserFormSubmitOptions
  ) => Promise<BrowserFormSubmitResult>;
  capture: (
    options: BrowserScreenshotOptions
  ) => Promise<BrowserScreenshotLayout>;
  capturePage: (
    options: readonly BrowserScreenshotOptions[],
    sessionOptions?: { concurrency?: number; staggerMs?: number }
  ) => Promise<BrowserScreenshotLayout[]>;
  close: () => Promise<void>;
};

export const createBrowserScreenshotSession = async (
  options: BrowserScreenshotOptions,
  dependencies = defaultBrowserScreenshotDependencies
): Promise<BrowserScreenshotSession> => {
  let runtime = await startBrowserRuntime(options, dependencies);
  let restartPromise: Promise<BrowserRuntime> | undefined;
  let closePromise: Promise<void> | undefined;
  let closed = false;
  const restart = async (failedRuntime: BrowserRuntime) => {
    if (runtime !== failedRuntime) {
      return runtime;
    }
    const pendingRestart =
      restartPromise ??
      (async () => {
        await failedRuntime.close();
        if (closed) {
          throw new BrowserSessionClosedError(
            "Browser screenshot session was closed."
          );
        }
        const next = await startBrowserRuntime(options, dependencies);
        if (closed) {
          await next.close();
          throw new BrowserSessionClosedError(
            "Browser screenshot session was closed."
          );
        }
        runtime = next;
        return next;
      })();
    restartPromise = pendingRestart;
    try {
      return await pendingRestart;
    } finally {
      if (restartPromise === pendingRestart) {
        restartPromise = undefined;
      }
    }
  };
  const captureWithRestart = async <Result>(
    capture: (activeRuntime: BrowserRuntime) => Promise<Result>
  ) => {
    if (closed) {
      throw new BrowserSessionClosedError(
        "Browser screenshot session was closed."
      );
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let activeRuntime = runtime;
      if (activeRuntime.running === false) {
        activeRuntime = await restart(activeRuntime);
      }
      try {
        return await capture(activeRuntime);
      } catch (error) {
        if (error instanceof BrowserSessionClosedError) {
          error.processExit ??= activeRuntime.processExit;
        }
        if (
          closed ||
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
    async submitForm(submitOptions) {
      if (closed) {
        throw new BrowserSessionClosedError(
          "Browser screenshot session was closed."
        );
      }
      // A form submission can have external effects. Never use captureWithRestart.
      return await submitFormWithBrowserRuntime(
        runtime,
        submitOptions,
        dependencies
      );
    },
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
    async capturePage(captureOptions, sessionOptions) {
      return await captureWithRestart(async (activeRuntime) => {
        const concurrency = sessionOptions?.concurrency ?? 1;
        const staggerMs = sessionOptions?.staggerMs ?? 0;
        if (Number.isInteger(concurrency) === false || concurrency < 1) {
          throw new Error("Screenshot concurrency must be a positive integer.");
        }
        if (Number.isFinite(staggerMs) === false || staggerMs < 0) {
          throw new Error("Screenshot stagger must be a non-negative number.");
        }
        if (concurrency === 1 || captureOptions.length < 2) {
          return await capturePageWithBrowserRuntime(
            activeRuntime,
            captureOptions,
            dependencies
          );
        }

        const groups = Array.from(
          { length: Math.min(concurrency, captureOptions.length) },
          () =>
            [] as Array<{ index: number; options: BrowserScreenshotOptions }>
        );
        captureOptions.forEach((options, index) => {
          groups[index % groups.length].push({ index, options });
        });
        const captures = await Promise.all(
          groups.map(async (group, index) => {
            if (index > 0 && staggerMs > 0) {
              await delay(index * staggerMs);
            }
            return {
              group,
              layouts: await capturePageWithBrowserRuntime(
                activeRuntime,
                group.map(({ options }) => options),
                dependencies
              ),
            };
          })
        );
        const layouts = new Array<BrowserScreenshotLayout>(
          captureOptions.length
        );
        for (const capture of captures) {
          capture.group.forEach(({ index }, groupIndex) => {
            const layout = capture.layouts[groupIndex];
            if (layout !== undefined) {
              layouts[index] = layout;
            }
          });
        }
        return layouts;
      });
    },
    async close() {
      closed = true;
      closePromise ??= (async () => {
        await restartPromise?.catch(() => undefined);
        await runtime.close();
      })();
      await closePromise;
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
