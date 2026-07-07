import { expect, test, vi } from "vitest";
import {
  createPreviewController,
  getPreviewDevArgs,
  getPreviewUrl,
  startPreviewDevServer,
  waitForPreviewReady,
  type PreviewServerDependencies,
} from "./preview-server";

const createDependencies = (
  overrides: Partial<PreviewServerDependencies> = {}
): PreviewServerDependencies => ({
  spawn: vi.fn(),
  fetch: vi.fn(async () => new Response("", { status: 200 })),
  sleep: vi.fn(async () => undefined),
  ...overrides,
});

const createPreviewProcess = (
  overrides: Partial<ReturnType<typeof startPreviewDevServer>["process"]> = {}
) =>
  ({
    pid: 123,
    killed: false,
    exitCode: null,
    signalCode: null,
    once: vi.fn(),
    ...overrides,
  }) as ReturnType<typeof startPreviewDevServer>["process"];

test("builds preview urls", () => {
  expect(getPreviewUrl({ host: "127.0.0.1", port: 5173, path: "/" })).toBe(
    "http://127.0.0.1:5173/"
  );
  expect(
    getPreviewUrl({ host: "127.0.0.1", port: 5173, path: "/pricing" })
  ).toBe("http://127.0.0.1:5173/pricing");
});

test("builds npm dev args with host and port", () => {
  expect(getPreviewDevArgs({ host: "127.0.0.1", port: 5173 })).toEqual([
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
  ]);
});

test("starts generated project dev server with inherited stdio", () => {
  const process = {} as ReturnType<typeof startPreviewDevServer>["process"];
  const spawn = vi.fn(() => process);

  expect(
    startPreviewDevServer(
      { host: "127.0.0.1", port: 5173 },
      createDependencies({ spawn: spawn as never })
    )
  ).toEqual({
    url: "http://127.0.0.1:5173/",
    process,
  });
  expect(spawn).toHaveBeenCalledWith(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
    { stdio: "inherit" }
  );
});

test("preview controller reuses a running server", () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({ spawn: spawn as never })
  );

  expect(controller.start()).toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
  });
  expect(controller.start()).toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
  });
  expect(controller.resolveUrl("/pricing")).toBe(
    "http://127.0.0.1:5173/pricing"
  );
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(spawn).toHaveBeenCalledWith(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
});

test("preview controller rejects incompatible start options while running", () => {
  const process = createPreviewProcess();
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({ spawn: vi.fn(() => process) as never })
  );

  controller.start();

  expect(() => controller.start({ port: 3000 })).toThrow(
    "Preview server is already running at http://127.0.0.1:5173/"
  );
});

test("preview controller reuses custom running options when start has no options", () => {
  const process = createPreviewProcess();
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({ spawn: vi.fn(() => process) as never })
  );

  expect(controller.start({ port: 3000 })).toEqual({
    url: "http://127.0.0.1:3000/",
    pid: 123,
    running: true,
  });
  expect(controller.start()).toEqual({
    url: "http://127.0.0.1:3000/",
    pid: 123,
    running: true,
  });
});

test("waits for preview server readiness", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("not ready"))
    .mockResolvedValueOnce(new Response("", { status: 200 }));
  const sleep = vi.fn(async () => undefined);

  await waitForPreviewReady(
    "http://127.0.0.1:5173/",
    { timeoutMs: 1000, intervalMs: 5 },
    createDependencies({ fetch, sleep })
  );

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(5);
});

test("preview controller waits when starting through startAndWait", async () => {
  const process = createPreviewProcess();
  const fetch = vi.fn(async () => new Response("", { status: 200 }));
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({ spawn: vi.fn(() => process) as never, fetch })
  );

  await expect(controller.startAndWait()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
  });
  expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:5173/", {
    method: "GET",
    signal: expect.any(AbortSignal),
  });
});

test("preview controller fails immediately when the dev server exits before readiness", async () => {
  const process = createPreviewProcess({ exitCode: 1 });
  const fetch = vi.fn(async () => new Response("", { status: 200 }));
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({ spawn: vi.fn(() => process) as never, fetch })
  );

  await expect(controller.startAndWait()).rejects.toThrow(
    "Preview server exited before it became ready at http://127.0.0.1:5173/."
  );
  expect(fetch).not.toHaveBeenCalled();
});
