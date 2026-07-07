import { Buffer } from "node:buffer";
import { expect, test, vi } from "vitest";
import {
  captureBrowserScreenshot,
  type BrowserScreenshotDependencies,
} from "./screenshot-browser-cdp";

class FakeBrowserProcess {
  readonly listeners = new Map<string, Array<(value?: unknown) => void>>();
  kill = vi.fn(() => {
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
  readonly listeners = new Map<
    string,
    Array<(event: { data?: string }) => void>
  >();

  constructor() {
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
    this.sentMethods.push(message.method);
    const respond = (result: unknown = {}) => {
      this.emit("message", {
        data: JSON.stringify({ id: message.id, result }),
      });
    };
    if (
      message.method === "Runtime.evaluate" &&
      typeof message.params?.expression === "string" &&
      message.params.expression.includes("document.querySelector")
    ) {
      setTimeout(() => respond({ result: { value: true } }), 0);
      return;
    }
    if (message.method === "Page.captureScreenshot") {
      setTimeout(
        () =>
          respond({
            data: Buffer.from("fake-png").toString("base64"),
          }),
        0
      );
      return;
    }
    setTimeout(() => {
      respond();
      if (message.method === "Page.navigate") {
        this.emit("message", {
          data: JSON.stringify({
            method: "Page.lifecycleEvent",
            params: { name: "networkIdle" },
          }),
        });
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
      url.endsWith("/json/list")
        ? [
            {
              type: "page",
              webSocketDebuggerUrl: "ws://127.0.0.1:9222/page/1",
            },
          ]
        : {},
  })) as unknown as typeof globalThis.fetch;
  return {
    spawnBrowser: vi.fn(
      () => browserProcess
    ) as unknown as BrowserScreenshotDependencies["spawnBrowser"],
    mkdtemp: vi.fn(
      async () => "/tmp/webstudio-browser-test"
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
      uid: 0,
      waitUntil: "networkidle",
      waitForSelector: "#ready",
      waitForTimeout: 0,
      timeout: 1000,
    },
    dependencies
  );

  expect(dependencies.spawnBrowser).toHaveBeenCalledWith(
    "/usr/bin/chromium",
    expect.arrayContaining([
      "--headless=new",
      "--remote-debugging-port=0",
      "--user-data-dir=/tmp/webstudio-browser-test",
      "--window-size=800,600",
      "--no-sandbox",
      "about:blank",
    ])
  );
  expect(dependencies.fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:9222/json/new?about:blank",
    { method: "PUT" }
  );
  expect(dependencies.fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:9222/json/list"
  );
  expect(dependencies.createWebSocket).toHaveBeenCalledWith(
    "ws://127.0.0.1:9222/page/1"
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
  expect(dependencies.writeFile).toHaveBeenCalledWith(
    "/tmp/current.png",
    Buffer.from("fake-png")
  );
  expect(socket.close).toHaveBeenCalled();
  expect(browserProcess.kill).toHaveBeenCalled();
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/webstudio-browser-test", {
    recursive: true,
    force: true,
  });
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
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/webstudio-browser-test", {
    recursive: true,
    force: true,
  });
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
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/webstudio-browser-test", {
    recursive: true,
    force: true,
  });
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
  expect(dependencies.rm).toHaveBeenCalledWith("/tmp/webstudio-browser-test", {
    recursive: true,
    force: true,
  });
});
