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
  await withDeadline(
    dependencies.fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
    }),
    "Browser page target could not be created",
    timeout
  );
  const targets = (await withDeadline(
    dependencies
      .fetch(`http://127.0.0.1:${port}/json/list`)
      .then((response) => response.json()),
    "Browser targets were not available",
    timeout
  )) as Array<{ type?: string; webSocketDebuggerUrl?: string }>;
  const target = targets.find(
    (candidate) =>
      candidate.type === "page" &&
      typeof candidate.webSocketDebuggerUrl === "string"
  );
  if (target?.webSocketDebuggerUrl === undefined) {
    throw new Error("Browser did not expose a page target.");
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
        const screenshot = await send<{ data: string }>(
          "Page.captureScreenshot",
          {
            format: "png",
            captureBeyondViewport: false,
          }
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
};
