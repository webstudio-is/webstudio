import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import {
  createPreviewController,
  getPreviewBuildArgs,
  getPreviewCommand,
  getPreviewStartArgs,
  getPreviewUrl,
  materializePreviewAssets,
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
  cp: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
  readdir: vi.fn(async () => []),
  readFile: vi.fn(async () => "") as never,
  writeFile: vi.fn(async () => undefined) as never,
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

test("materializes downloaded assets into the production client tree", async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-preview-assets-"));
  try {
    await mkdir(join(directory, "public", "assets"), { recursive: true });
    await writeFile(
      join(directory, "public", "assets", "image.png"),
      "downloaded"
    );

    await materializePreviewAssets(directory);

    await expect(
      readFile(
        join(directory, "build", "client", "assets", "image.png"),
        "utf8"
      )
    ).resolves.toBe("downloaded");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("does not fail when the generated preview has no downloaded assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-preview-assets-"));
  try {
    await expect(materializePreviewAssets(directory)).resolves.toBeUndefined();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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

test("passes explicit external image domains to the preview optimizer", () => {
  const process = {} as ReturnType<typeof startPreviewServer>["process"];
  const spawn = vi.fn(() => process);

  startPreviewServer(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      imageDomains: ["storage.example.com", "images.example.org"],
    },
    createDependencies({ spawn: spawn as never })
  );

  expect(spawn).toHaveBeenCalledWith(
    "npm",
    ["run", "start"],
    expect.objectContaining({
      env: expect.objectContaining({
        DOMAINS: "storage.example.com,images.example.org",
      }),
    })
  );
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

test("preview controller reuses a matching persisted production build", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  const readFile = vi.fn(async () => "cache-key");
  const writeFile = vi.fn(async () => undefined);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({
      spawn: spawn as never,
      readFile: readFile as never,
      writeFile: writeFile as never,
    })
  );

  await expect(
    controller.start({ buildCacheKey: "cache-key" })
  ).resolves.toMatchObject({ running: true });

  expect(readFile).toHaveBeenCalledWith(
    "/tmp/preview/.webstudio-preview-build",
    "utf8"
  );
  expect(spawn).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledWith(
    "npm",
    ["run", "start"],
    expect.any(Object)
  );
  expect(writeFile).not.toHaveBeenCalled();
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
  await expect(
    controller.start({ imageDomains: ["images.example.com"] })
  ).rejects.toThrow(
    "Preview server is already running at http://127.0.0.1:5173/"
  );
});

test("preview controller passes image domains to the managed server", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  const spawn = vi
    .fn()
    .mockReturnValueOnce(buildProcess)
    .mockReturnValueOnce(process);
  resolveProcessExit(buildProcess);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    createDependencies({ spawn: spawn as never })
  );

  await controller.start({ imageDomains: ["images.example.com"] });

  expect(spawn).toHaveBeenLastCalledWith(
    "npm",
    ["run", "start"],
    expect.objectContaining({
      env: expect.objectContaining({ DOMAINS: "images.example.com" }),
    })
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

test("waits until the latest preview build asset is served", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response('<link rel="stylesheet" href="/assets/index-old.css" />', {
        status: 200,
      })
    )
    .mockResolvedValueOnce(
      new Response('<link rel="stylesheet" href="/assets/index-new.css" />', {
        status: 200,
      })
    );
  const sleep = vi.fn(async () => undefined);

  await waitForPreviewReady(
    "http://127.0.0.1:5173/",
    {
      timeoutMs: 1000,
      intervalMs: 5,
      requiredAssetNames: ["index-new.css"],
    },
    createDependencies({ fetch, sleep })
  );

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(5);
});

test("requires the exact generated project even when build assets match", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        '<html data-ws-project="other-project"><link rel="stylesheet" href="/assets/index-new.css" /></html>',
        { status: 200 }
      )
  );

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1,
        intervalMs: 5,
        requiredAssetNames: ["index-new.css"],
        requiredProjectId: "expected-project",
      },
      createDependencies({ fetch })
    )
  ).rejects.toThrow(
    "Preview server at http://127.0.0.1:5173/ did not serve the expected generated project."
  );
});

test("accepts the generated preview with the expected project marker", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        '<html data-ws-project="expected-project"><link rel="stylesheet" href="/assets/index-new.css" /></html>',
        { status: 200 }
      )
  );

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1000,
        requiredAssetNames: ["index-new.css"],
        requiredProjectId: "expected-project",
      },
      createDependencies({ fetch })
    )
  ).resolves.toBeUndefined();
});

test("rejects stale preview servers that serve a previous build", async () => {
  const fetch = vi.fn(
    async () =>
      new Response('<link rel="stylesheet" href="/assets/index-old.css" />', {
        status: 200,
      })
  );

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1,
        intervalMs: 5,
        requiredAssetNames: ["index-new.css"],
      },
      createDependencies({ fetch })
    )
  ).rejects.toThrow(
    "Preview server at http://127.0.0.1:5173/ did not serve the latest build assets."
  );
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

test("preview controller derives and verifies the generated project identity", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  const readFile = vi.fn(async () =>
    JSON.stringify({ build: { projectId: "expected-project" } })
  );
  const fetch = vi.fn(
    async () =>
      new Response('<html data-ws-project="expected-project"></html>', {
        status: 200,
      })
  );
  resolveProcessExit(buildProcess);
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
      readFile: readFile as never,
      fetch,
    })
  );

  await expect(controller.startAndWait()).resolves.toMatchObject({
    running: true,
  });
  expect(readFile).toHaveBeenCalledWith(
    "/tmp/preview/.webstudio/data.json",
    "utf8"
  );
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
