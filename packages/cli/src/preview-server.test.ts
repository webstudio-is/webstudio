import { expect, test, vi } from "vitest";
import {
  createPreviewController,
  getPreviewBuildArgs,
  getPreviewCommand,
  getPreviewStartArgs,
  getPreviewUrl,
  runPreviewBuild,
  startPreviewServer,
  waitForPreviewReady,
  type PreviewServerDependencies,
} from "./preview-server";

const createDependencies = (
  overrides: Partial<PreviewServerDependencies> = {}
): PreviewServerDependencies => ({
  spawn: vi.fn(),
  fetch: vi.fn(async () => new Response("", { status: 200 })),
  sleep: vi.fn(async () => undefined),
  platform: "linux",
  ...overrides,
});

const createPreviewProcess = (
  overrides: Partial<ReturnType<typeof startPreviewServer>["process"]> = {}
) =>
  ({
    pid: 123,
    killed: false,
    exitCode: null,
    signalCode: null,
    once: vi.fn(),
    kill: vi.fn(() => true),
    ...overrides,
  }) as ReturnType<typeof startPreviewServer>["process"];

const resolveProcessExit = (
  process: ReturnType<typeof startPreviewServer>["process"],
  code: number | null = 0
) => {
  vi.mocked(
    process.once as (event: string, callback: unknown) => unknown
  ).mockImplementation((event, callback) => {
    if (event === "exit" && typeof callback === "function") {
      (
        callback as (code: number | null, signal: NodeJS.Signals | null) => void
      )(code, null);
    }
    return process;
  });
};

test("builds preview urls", () => {
  expect(getPreviewUrl({ host: "127.0.0.1", port: 5173, path: "/" })).toBe(
    "http://127.0.0.1:5173/"
  );
  expect(
    getPreviewUrl({ host: "127.0.0.1", port: 5173, path: "/pricing" })
  ).toBe("http://127.0.0.1:5173/pricing");
});

test("builds npm production preview args", () => {
  expect(getPreviewBuildArgs()).toEqual(["run", "build"]);
  expect(getPreviewStartArgs({ host: "127.0.0.1", port: 5173 })).toEqual([
    "run",
    "start",
  ]);
});

test("uses the platform npm executable for preview commands", () => {
  expect(getPreviewCommand("linux")).toBe("npm");
  expect(getPreviewCommand("darwin")).toBe("npm");
  expect(getPreviewCommand("win32")).toBe("npm.cmd");
});

test("runs generated project production build", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  resolveProcessExit(process);

  await runPreviewBuild(
    createDependencies({ spawn: spawn as never }),
    "/tmp/preview"
  );

  expect(spawn).toHaveBeenCalledWith("npm", ["run", "build"], {
    cwd: "/tmp/preview",
    stdio: "inherit",
    env: expect.objectContaining({ NODE_ENV: "production" }),
  });
});

test("runs generated project production build with the windows npm executable", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  resolveProcessExit(process);

  await runPreviewBuild(
    createDependencies({ spawn: spawn as never, platform: "win32" }),
    "C:/project/.webstudio/preview"
  );

  expect(spawn).toHaveBeenCalledWith("npm.cmd", ["run", "build"], {
    cwd: "C:/project/.webstudio/preview",
    stdio: "inherit",
    env: expect.objectContaining({ NODE_ENV: "production" }),
  });
});

test("starts generated project production server with inherited stdio", () => {
  const process = {} as ReturnType<typeof startPreviewServer>["process"];
  const spawn = vi.fn(() => process);

  expect(
    startPreviewServer(
      { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
      createDependencies({ spawn: spawn as never })
    )
  ).toEqual({
    url: "http://127.0.0.1:5173/",
    process,
  });
  expect(spawn).toHaveBeenCalledWith("npm", ["run", "start"], {
    cwd: "/tmp/preview",
    stdio: "inherit",
    env: expect.objectContaining({
      HOST: "127.0.0.1",
      PORT: "5173",
      NODE_ENV: "production",
    }),
  });
});

test("starts generated project production server with the windows npm executable", () => {
  const process = {} as ReturnType<typeof startPreviewServer>["process"];
  const spawn = vi.fn(() => process);

  expect(
    startPreviewServer(
      {
        host: "127.0.0.1",
        port: 5173,
        cwd: "C:/project/.webstudio/preview",
      },
      createDependencies({ spawn: spawn as never, platform: "win32" })
    )
  ).toEqual({
    url: "http://127.0.0.1:5173/",
    process,
  });
  expect(spawn).toHaveBeenCalledWith("npm.cmd", ["run", "start"], {
    cwd: "C:/project/.webstudio/preview",
    stdio: "inherit",
    env: expect.objectContaining({
      HOST: "127.0.0.1",
      PORT: "5173",
      NODE_ENV: "production",
    }),
  });
});

test("preview controller builds once and reuses a running server", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  const spawn = vi.fn(() => process);
  spawn.mockReturnValueOnce(buildProcess);
  spawn.mockReturnValueOnce(process);
  resolveProcessExit(buildProcess);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({ spawn: spawn as never })
  );

  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
  });
  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
  });
  expect(controller.resolveUrl("/pricing")).toBe(
    "http://127.0.0.1:5173/pricing"
  );
  expect(spawn).toHaveBeenCalledTimes(2);
  expect(spawn).toHaveBeenLastCalledWith("npm", ["run", "start"], {
    cwd: "/tmp/preview",
    stdio: ["ignore", "pipe", "pipe"],
    env: expect.objectContaining({
      HOST: "127.0.0.1",
      PORT: "5173",
      NODE_ENV: "production",
    }),
  });
});

test("preview controller rejects incompatible start options while running", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
    })
  );
  resolveProcessExit(buildProcess);

  await controller.start();

  await expect(controller.start({ port: 3000 })).rejects.toThrow(
    "Preview server is already running at http://127.0.0.1:5173/"
  );
  await expect(controller.start({ cwd: "/tmp/other-preview" })).rejects.toThrow(
    "Preview server is already running at http://127.0.0.1:5173/"
  );
});

test("preview controller stops the running server", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
    })
  );
  resolveProcessExit(buildProcess);
  let exitListener: (() => void) | undefined;
  vi.mocked(
    process.once as (event: string, callback: unknown) => unknown
  ).mockImplementation((event, callback) => {
    if (event === "exit" && typeof callback === "function") {
      exitListener = callback as () => void;
    }
    return process;
  });
  vi.mocked(process.kill).mockImplementation(() => {
    exitListener?.();
    return true;
  });

  await controller.start();

  await expect(controller.stop()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: undefined,
    running: false,
  });
  expect(process.kill).toHaveBeenCalledOnce();
  await expect(controller.stop()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: undefined,
    running: false,
  });
});

test("preview controller reuses custom running options when start has no options", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
    })
  );
  resolveProcessExit(buildProcess);

  await expect(controller.start({ port: 3000 })).resolves.toEqual({
    url: "http://127.0.0.1:3000/",
    pid: 123,
    running: true,
  });
  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:3000/",
    pid: 123,
    running: true,
  });
});

test("preview controller can restart a running server after rebuilding", async () => {
  const firstProcess = createPreviewProcess();
  const secondProcess = createPreviewProcess({ pid: 456 });
  const firstBuildProcess = createPreviewProcess();
  const secondBuildProcess = createPreviewProcess();
  const spawn = vi
    .fn()
    .mockReturnValueOnce(firstBuildProcess)
    .mockReturnValueOnce(firstProcess)
    .mockReturnValueOnce(secondBuildProcess)
    .mockReturnValueOnce(secondProcess);
  resolveProcessExit(firstBuildProcess);
  resolveProcessExit(secondBuildProcess);

  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({ spawn: spawn as never })
  );

  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
  });
  resolveProcessExit(firstProcess);
  await expect(controller.start({ restart: true })).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 456,
    running: true,
  });

  expect(firstProcess.kill).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledTimes(4);
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
  const buildProcess = createPreviewProcess();
  const fetch = vi.fn(async () => new Response("", { status: 200 }));
  resolveProcessExit(buildProcess);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
      fetch,
    })
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
  const process = createPreviewProcess({
    exitCode: 1,
    stderr: {
      on: vi.fn((event: string, handler: (chunk: Buffer) => void) => {
        if (event === "data") {
          handler(
            Buffer.from(
              "Error: listen EADDRINUSE: address already in use 127.0.0.1:5173"
            )
          );
        }
        return process.stderr;
      }),
    } as never,
  });
  const buildProcess = createPreviewProcess();
  const fetch = vi.fn(async () => new Response("", { status: 200 }));
  resolveProcessExit(buildProcess);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
      fetch,
    })
  );
  await expect(controller.startAndWait()).rejects.toThrow(
    [
      "Preview server exited before it became ready at http://127.0.0.1:5173/.",
      "",
      "Preview server output:",
      "Error: listen EADDRINUSE: address already in use 127.0.0.1:5173",
      "",
      "Port is already in use. Stop the existing preview server for http://127.0.0.1:5173/, or start preview with a different port.",
    ].join("\n")
  );
  expect(fetch).not.toHaveBeenCalled();
});
