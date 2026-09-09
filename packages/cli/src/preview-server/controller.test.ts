import { expect, test, vi } from "vitest";
import { createPreviewController } from "./controller";
import {
  createDependencies,
  createPreviewProcess,
  resolveProcessExit,
} from "./test-utils";

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

test("preview controller disconnects the owned preview supervisor", async () => {
  const process = createPreviewProcess();
  let exitListener: (() => void) | undefined;
  const controller = createPreviewController(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "/tmp/preview",
      mode: "iterative",
    },
    createDependencies({
      spawn: vi.fn(() => process) as never,
    })
  );
  vi.mocked(
    process.once as (event: string, callback: unknown) => unknown
  ).mockImplementation((event, callback) => {
    if (event === "exit" && typeof callback === "function") {
      exitListener = callback as () => void;
    }
    return process;
  });
  vi.mocked(process.disconnect).mockImplementation(() => {
    exitListener?.();
  });

  await controller.start();
  await controller.stop();

  expect(process.disconnect).toHaveBeenCalledOnce();
  expect(process.kill).not.toHaveBeenCalled();
});

test("preview controller disconnects its supervisor before propagating termination", async () => {
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

  expect(process.disconnect).toHaveBeenCalledOnce();
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
    mode: "production",
  });
  resolveProcessExit(firstProcess);
  await expect(controller.start({ restart: true })).resolves.toEqual({
    url: "http://127.0.0.1:5173/",
    pid: 456,
    running: true,
    mode: "production",
  });

  expect(firstProcess.disconnect).toHaveBeenCalledOnce();
  expect(spawn).toHaveBeenCalledTimes(4);
});

test("ignores a delayed exit from a previously owned preview server", async () => {
  let firstExit: (() => void) | undefined;
  const firstProcess = createPreviewProcess({
    connected: false,
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
    createDependencies({ spawn: spawn as never })
  );

  await controller.start();
  await controller.start({ restart: true });
  firstExit?.();

  expect(controller.status()).toMatchObject({
    pid: 456,
    running: true,
  });
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

test("preserves readiness diagnostics when adding preview output", async () => {
  let now = 0;
  const dateNow = vi.spyOn(Date, "now").mockImplementation(() => now);
  const process = createPreviewProcess({
    stdout: {
      on: vi.fn((event: string, handler: (chunk: Buffer) => void) => {
        if (event === "data") {
          handler(Buffer.from("Local: http://127.0.0.1:5173/"));
        }
        return process.stdout;
      }),
    } as never,
  });
  const controller = createPreviewController(
    { host: "127.0.0.1", port: 5173, mode: "iterative" },
    createDependencies({
      spawn: vi.fn(() => process) as never,
      fetch: vi.fn(async () => new Response("failed", { status: 500 })),
      sleep: async (duration) => {
        now += duration;
      },
    })
  );

  try {
    const result = expect(controller.startAndWait()).rejects.toMatchObject({
      code: "PREVIEW_HTTP_ERROR",
      message: expect.stringContaining(
        "Preview server output:\nLocal: http://127.0.0.1:5173/"
      ),
      issues: [
        {
          code: "preview_http_error",
          path: [],
          constraint: "http_status:500",
        },
      ],
    });
    await result;
  } finally {
    dateNow.mockRestore();
  }
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
  await expect(controller.startAndWait()).rejects.toMatchObject({
    code: "PREVIEW_PORT_IN_USE",
    message: [
      "Preview server exited before it became ready at http://127.0.0.1:5173/.",
      "",
      "Preview server output:",
      "Error: listen EADDRINUSE: address already in use 127.0.0.1:5173",
      "",
      "Port is already in use. Stop the existing preview server for http://127.0.0.1:5173/, or start preview with a different port.",
    ].join("\n"),
    issues: [
      {
        code: "preview_port_in_use",
        path: [],
        constraint: "available_preview_port",
      },
    ],
  });
  expect(fetch).not.toHaveBeenCalled();
});
