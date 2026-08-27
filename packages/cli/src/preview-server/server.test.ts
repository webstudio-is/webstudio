import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import {
  findAvailablePort,
  getPreviewBuildArgs,
  getPreviewStartArgs,
  getPreviewUrl,
  isPreviewPortAvailable,
  materializePreviewAssets,
  runPreviewBuild,
  startPreviewServer,
} from "./server";
import {
  createDependencies,
  createPreviewProcess,
  resolveProcessExit,
} from "./test-utils";

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

test("runs generated project production build", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  resolveProcessExit(process);

  await runPreviewBuild(
    createDependencies({
      spawn: spawn as never,
      nodeExecPath: "/opt/webstudio-node/bin/node",
    }),
    "/tmp/preview"
  );

  expect(spawn).toHaveBeenCalledWith("npm", ["run", "build"], {
    cwd: "/tmp/preview",
    stdio: "inherit",
    env: expect.objectContaining({
      CI: "1",
      NODE_ENV: "production",
      PATH: expect.stringMatching(/^\/opt\/webstudio-node\/bin:/),
    }),
  });
});

test("runs generated project production build through windows pnpm", async () => {
  const process = createPreviewProcess();
  const spawn = vi.fn(() => process);
  resolveProcessExit(process);

  await runPreviewBuild(
    createDependencies({
      spawn: spawn as never,
      nodeExecPath: "C:\\Program Files\\Codex\\node.exe",
      npmExecPath:
        "C:\\Program Files\\Codex\\node_modules\\pnpm\\bin\\pnpm.cjs",
      platform: "win32",
    }),
    "C:/project/.webstudio/preview"
  );

  expect(spawn).toHaveBeenCalledWith(
    "C:\\Program Files\\Codex\\node.exe",
    [
      "C:\\Program Files\\Codex\\node_modules\\pnpm\\bin\\pnpm.cjs",
      "run",
      "build",
    ],
    expect.objectContaining({ cwd: "C:/project/.webstudio/preview" })
  );
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

test("starts generated project production server through windows pnpm", () => {
  const process = {} as ReturnType<typeof startPreviewServer>["process"];
  const spawn = vi.fn(() => process);

  startPreviewServer(
    {
      host: "127.0.0.1",
      port: 5173,
      cwd: "C:/project/.webstudio/preview",
    },
    createDependencies({
      spawn: spawn as never,
      nodeExecPath: "C:\\Program Files\\Codex\\node.exe",
      npmExecPath:
        "C:\\Program Files\\Codex\\node_modules\\pnpm\\bin\\pnpm.cjs",
      platform: "win32",
    })
  );

  expect(spawn).toHaveBeenCalledWith(
    "C:\\Program Files\\Codex\\node.exe",
    [
      "/tmp/preview-process-supervisor.js",
      JSON.stringify({
        command: "C:\\Program Files\\Codex\\node.exe",
        args: [
          "C:\\Program Files\\Codex\\node_modules\\pnpm\\bin\\pnpm.cjs",
          "run",
          "start",
        ],
        cwd: "C:/project/.webstudio/preview",
        ownerFile: "C:/project/.webstudio/preview-process.json",
      }),
    ],
    expect.objectContaining({ cwd: "C:/project/.webstudio/preview" })
  );
});
