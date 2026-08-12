import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import {
  createPreviewController,
  findAvailablePort,
  getPreviewBuildArgs,
  getNpmInvocation,
  getPreviewStartArgs,
  getPreviewUrl,
  isPreviewPortAvailable,
  materializePreviewAssets,
  runPreviewBuild,
  startPreviewServer,
  waitForPreviewReady,
  type PreviewServerDependencies,
} from "./preview-server";

test("allocates an available local preview port", async () => {
  const port = await findAvailablePort();

  expect(port).toBeGreaterThan(0);
  expect(port).toBeLessThanOrEqual(65_535);
});

test("repeatedly reports an unoccupied explicit preview port as available", async () => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected the test server to have a TCP address.");
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });

  await expect(isPreviewPortAvailable("127.0.0.1", address.port)).resolves.toBe(
    true
  );
  await expect(isPreviewPortAvailable("127.0.0.1", address.port)).resolves.toBe(
    true
  );
});

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
  killProcess: vi.fn(() => true),
  killWindowsProcessTree: vi.fn(async () => true),
  parentProcess: {
    pid: 456,
    once: vi.fn(),
    off: vi.fn(),
    kill: vi.fn(() => true),
  },
  nodeExecPath: "/usr/bin/node",
  npmExecPath: undefined,
  processExecArgv: [],
  supervisorPath: "/tmp/preview-process-supervisor.js",
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

test("builds iterative preview args for an ordinary reload server", () => {
  expect(
    getPreviewStartArgs({
      host: "127.0.0.1",
      port: 5173,
      mode: "iterative",
    })
  ).toEqual([
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ]);
});

test("reuses the npm cli that launched webstudio for preview commands", () => {
  expect(
    getNpmInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath:
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      platform: "win32",
    })
  ).toEqual({
    command: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
  });
});

test("uses npm-cli when webstudio was launched through npx on windows", () => {
  expect(
    getNpmInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath:
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      platform: "win32",
    })
  ).toEqual({
    command: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
  });
});

test("uses npm-cli when windows npm launcher metadata is unavailable", () => {
  expect(
    getNpmInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath: undefined,
      platform: "win32",
    })
  ).toEqual({
    command: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
  });
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
    env: expect.objectContaining({ CI: "1", NODE_ENV: "production" }),
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

test("runs generated project production build through windows npm-cli", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  resolveProcessExit(process);

  await runPreviewBuild(
    createDependencies({
      spawn: spawn as never,
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      platform: "win32",
    }),
    "C:/project/.webstudio/preview"
  );

  expect(spawn).toHaveBeenCalledWith(
    "C:\\Program Files\\nodejs\\node.exe",
    [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
    {
      cwd: "C:/project/.webstudio/preview",
      stdio: "inherit",
      env: expect.objectContaining({ NODE_ENV: "production" }),
    }
  );
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
  expect(spawn).toHaveBeenCalledWith(
    "/usr/bin/node",
    [
      "/tmp/preview-process-supervisor.js",
      JSON.stringify({
        command: "npm",
        args: ["run", "start"],
        cwd: "/tmp/preview",
        ownerFile: "/tmp/preview-process.json",
      }),
    ],
    {
      cwd: "/tmp/preview",
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: expect.objectContaining({
        HOST: "127.0.0.1",
        PORT: "5173",
        NODE_ENV: "production",
      }),
    }
  );
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
    "/usr/bin/node",
    ["/tmp/preview-process-supervisor.js", expect.any(String)],
    expect.objectContaining({
      env: expect.objectContaining({
        DOMAINS: "storage.example.com,images.example.org",
      }),
    })
  );
});

test("starts generated project production server through windows npm-cli", () => {
  const process = {} as ReturnType<typeof startPreviewServer>["process"];
  const spawn = vi.fn(() => process);

  expect(
    startPreviewServer(
      {
        host: "127.0.0.1",
        port: 5173,
        cwd: "C:/project/.webstudio/preview",
      },
      createDependencies({
        spawn: spawn as never,
        nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
        platform: "win32",
      })
    )
  ).toEqual({
    url: "http://127.0.0.1:5173/",
    process,
  });
  expect(spawn).toHaveBeenCalledWith(
    "C:\\Program Files\\nodejs\\node.exe",
    [
      "/tmp/preview-process-supervisor.js",
      JSON.stringify({
        command: "C:\\Program Files\\nodejs\\node.exe",
        args: [
          "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
          "run",
          "start",
        ],
        cwd: "C:/project/.webstudio/preview",
        ownerFile: "C:/project/.webstudio/preview-process.json",
      }),
    ],
    {
      cwd: "C:/project/.webstudio/preview",
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: expect.objectContaining({
        HOST: "127.0.0.1",
        PORT: "5173",
        NODE_ENV: "production",
      }),
    }
  );
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
    mode: "production",
  });
  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
    mode: "production",
  });
  expect(controller.resolveUrl("/pricing")).toBe(
    "http://127.0.0.1:5173/pricing"
  );
  expect(spawn).toHaveBeenCalledTimes(2);
  expect(spawn).toHaveBeenLastCalledWith(
    "/usr/bin/node",
    [
      "/tmp/preview-process-supervisor.js",
      JSON.stringify({
        command: "npm",
        args: ["run", "start"],
        cwd: "/tmp/preview",
        ownerFile: "/tmp/preview-process.json",
      }),
    ],
    {
      cwd: "/tmp/preview",
      detached: true,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      env: expect.objectContaining({
        HOST: "127.0.0.1",
        PORT: "5173",
        NODE_ENV: "production",
      }),
    }
  );
});

test("iterative preview starts without a production build", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      mode: "iterative",
    },
    createDependencies({ spawn: spawn as never })
  );

  await expect(controller.start()).resolves.toMatchObject({
    running: true,
    mode: "iterative",
  });
  expect(spawn).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledWith(
    "/usr/bin/node",
    [
      "/tmp/preview-process-supervisor.js",
      JSON.stringify({
        command: "npm",
        args: [
          "run",
          "dev",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          "5173",
          "--strictPort",
        ],
        cwd: "/tmp/preview",
        ownerFile: "/tmp/preview-process.json",
      }),
    ],
    expect.objectContaining({
      env: expect.objectContaining({
        NODE_ENV: "development",
        WEBSTUDIO_PREVIEW_HMR: "disabled",
      }),
    })
  );
});

test("starts a managed Windows preview through npm-cli with supported spawn options", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "C:/project/.webstudio/preview",
      mode: "iterative",
    },
    createDependencies({
      spawn: spawn as never,
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath:
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      platform: "win32",
    })
  );

  await expect(controller.start()).resolves.toMatchObject({ running: true });

  expect(spawn).toHaveBeenCalledWith(
    "C:\\Program Files\\nodejs\\node.exe",
    [
      "/tmp/preview-process-supervisor.js",
      JSON.stringify({
        command: "C:\\Program Files\\nodejs\\node.exe",
        args: [
          "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
          "run",
          "dev",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          "5173",
          "--strictPort",
        ],
        cwd: "C:/project/.webstudio/preview",
        ownerFile: "C:/project/.webstudio/preview-process.json",
      }),
    ],
    expect.objectContaining({
      cwd: "C:/project/.webstudio/preview",
      detached: false,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    })
  );
});

test("preview status omits fabricated server details when stopped", () => {
  const controller = createPreviewController({
    host: "127.0.0.1",
    port: 5173,
  });

  expect(controller.status()).toEqual({
    running: false,
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
    "/usr/bin/node",
    ["/tmp/preview-process-supervisor.js", expect.any(String)],
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

  expect(controller.canReuse()).toBe(false);
  await controller.start();
  expect(controller.canReuse()).toBe(true);
  expect(controller.canReuse({ host: "127.0.0.1", port: 5173 })).toBe(true);
  expect(controller.canReuse({ port: 3000 })).toBe(false);
  expect(controller.canReuse({ cwd: "/tmp/other-preview" })).toBe(false);
  expect(controller.canReuse({ mode: "iterative" })).toBe(false);
  expect(controller.canReuse({ imageDomains: ["images.example.com"] })).toBe(
    false
  );

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

  expect(controller.canReuse({ imageDomains: ["images.example.com"] })).toBe(
    true
  );

  expect(spawn).toHaveBeenLastCalledWith(
    "/usr/bin/node",
    ["/tmp/preview-process-supervisor.js", expect.any(String)],
    expect.objectContaining({
      env: expect.objectContaining({ DOMAINS: "images.example.com" }),
    })
  );
});

test("preview controller stops the Windows preview process tree", async () => {
  const process = createPreviewProcess();
  const buildProcess = createPreviewProcess();
  let exitListener: (() => void) | undefined;
  const killWindowsProcessTree = vi.fn(async () => {
    exitListener?.();
    return true;
  });
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({
      platform: "win32",
      killWindowsProcessTree,
      spawn: vi
        .fn()
        .mockReturnValueOnce(buildProcess)
        .mockReturnValueOnce(process) as never,
    })
  );
  resolveProcessExit(buildProcess);
  vi.mocked(
    process.once as (event: string, callback: unknown) => unknown
  ).mockImplementation((event, callback) => {
    if (event === "exit" && typeof callback === "function") {
      exitListener = callback as () => void;
    }
    return process;
  });
  await controller.start();

  await expect(controller.stop()).resolves.toEqual({
    running: false,
  });
  expect(killWindowsProcessTree).toHaveBeenCalledWith(123);
  expect(process.kill).not.toHaveBeenCalled();
  await expect(controller.stop()).resolves.toEqual({
    running: false,
  });
});

test("preview controller stops the entire POSIX preview process group", async () => {
  const process = createPreviewProcess();
  const killProcess = vi.fn(() => true);
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      mode: "iterative",
    },
    createDependencies({
      spawn: vi.fn(() => process) as never,
      killProcess,
    })
  );
  let exitListener: (() => void) | undefined;
  vi.mocked(
    process.once as (event: string, callback: unknown) => unknown
  ).mockImplementation((event, callback) => {
    if (event === "exit" && typeof callback === "function") {
      exitListener = callback as () => void;
    }
    return process;
  });
  killProcess.mockImplementation(() => {
    exitListener?.();
    return true;
  });

  await controller.start();
  await controller.stop();

  expect(killProcess).toHaveBeenCalledWith(-123, "SIGTERM");
  expect(process.kill).not.toHaveBeenCalled();
});

test("preview controller stops its process group before propagating termination", async () => {
  const process = createPreviewProcess();
  const killProcess = vi.fn(() => true);
  const parentProcess = {
    pid: 456,
    once: vi.fn(),
    off: vi.fn(),
    kill: vi.fn(() => true),
  };
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      mode: "iterative",
    },
    createDependencies({
      spawn: vi.fn(() => process) as never,
      killProcess,
      parentProcess,
    })
  );

  await controller.start();
  const signalHandler = vi
    .mocked(parentProcess.once)
    .mock.calls.find(([signal]) => signal === "SIGTERM")?.[1] as
    | (() => void)
    | undefined;
  signalHandler?.();

  await vi.waitFor(() => {
    expect(parentProcess.kill).toHaveBeenCalledWith(456, "SIGTERM");
  });

  expect(killProcess).toHaveBeenCalledWith(-123, "SIGTERM");
  expect(controller.status().running).toBe(false);
});

test("lets an outer lifecycle owner manage process signals", async () => {
  const process = createPreviewProcess();
  const parentProcess = {
    pid: 456,
    once: vi.fn(),
    off: vi.fn(),
    kill: vi.fn(() => true),
  };
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      mode: "iterative",
    },
    createDependencies({
      spawn: vi.fn(() => process) as never,
      parentProcess,
    }),
    { manageProcessSignals: false }
  );

  await controller.start();

  expect(parentProcess.once).not.toHaveBeenCalled();
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
    mode: "production",
  });
  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:3000/",
    pid: 123,
    running: true,
    mode: "production",
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
  const killProcess = vi.fn(() => true);
  resolveProcessExit(firstBuildProcess);
  resolveProcessExit(secondBuildProcess);

  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, cwd: "/tmp/preview" },
    createDependencies({ spawn: spawn as never, killProcess })
  );

  await expect(controller.start()).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 123,
    running: true,
    mode: "production",
  });
  resolveProcessExit(firstProcess);
  await expect(controller.start({ restart: true })).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 456,
    running: true,
    mode: "production",
  });

  expect(killProcess).toHaveBeenCalledWith(-123, "SIGTERM");
  expect(spawn).toHaveBeenCalledTimes(4);
});

test("ignores a delayed exit from a previously owned preview server", async () => {
  let firstExit: (() => void) | undefined;
  const firstProcess = createPreviewProcess({
    once: vi.fn((event: string, callback: () => void) => {
      if (event === "exit") {
        firstExit = callback;
      }
      return undefined;
    }) as never,
    kill: vi.fn(() => false),
  });
  const secondProcess = createPreviewProcess({ pid: 456 });
  const spawn = vi
    .fn()
    .mockReturnValueOnce(firstProcess)
    .mockReturnValueOnce(secondProcess);
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      mode: "iterative",
    },
    createDependencies({
      spawn: spawn as never,
      killProcess: vi.fn(() => false),
    })
  );

  await controller.start();
  await controller.start({ restart: true });
  firstExit?.();

  expect(controller.status()).toMatchObject({
    pid: 456,
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
        requiredProject: { projectId: "expected-project" },
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
        requiredProject: { projectId: "expected-project" },
      },
      createDependencies({ fetch })
    )
  ).resolves.toBeUndefined();
});

test("uses the static identity marker when page authentication blocks readiness", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
    .mockResolvedValueOnce(Response.json({ projectId: "project", version: 5 }));

  await expect(
    waitForPreviewReady(
      "http://127.0.0.1:5173/",
      {
        timeoutMs: 1000,
        requiredProject: { projectId: "project", version: 5 },
      },
      createDependencies({ fetch })
    )
  ).resolves.toBeUndefined();
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    new URL("http://127.0.0.1:5173/__webstudio/preview.json"),
    expect.objectContaining({ method: "GET" })
  );
});

test("waits for the exact generated session version", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        '<html data-ws-project="project" data-ws-version="4"></html>'
      )
    )
    .mockResolvedValueOnce(
      new Response(
        '<html data-ws-project="project" data-ws-version="5"></html>'
      )
    );

  await waitForPreviewReady(
    "http://127.0.0.1:5173/",
    {
      timeoutMs: 1000,
      intervalMs: 5,
      requiredProject: { projectId: "project", version: 5 },
    },
    createDependencies({ fetch })
  );

  expect(fetch).toHaveBeenCalledTimes(2);
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
    mode: "production",
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
