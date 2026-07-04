import { expect, test, vi } from "vitest";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
import { __testing__, mcpOptions, prepareMcpProjectSession } from "./mcp";

test("documents MCP stdio startup and discovery tools", () => {
  const yargs = {
    example: vi.fn(() => yargs),
    epilogue: vi.fn(() => yargs),
  };

  mcpOptions(yargs as never);

  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp",
    "Run a local MCP server over stdio for the configured Webstudio project"
  );
  expect(yargs.example).toHaveBeenCalledWith(
    "MCP tool: meta.index",
    "Discover the concise capability catalog after the server starts"
  );
  expect(yargs.epilogue).toHaveBeenCalledWith(
    expect.stringContaining("tools/list")
  );
  expect(yargs.epilogue).toHaveBeenCalledWith(
    expect.stringContaining("current Builder dev build")
  );
  expect(yargs.epilogue).toHaveBeenCalledWith(
    expect.stringContaining("webstudio://project/guide")
  );
});

test("marks cached namespaces stale before serving MCP tools", async () => {
  const session = {
    initialize: vi.fn(async () => undefined),
    markStale: vi.fn(async () => undefined),
  };

  await prepareMcpProjectSession(session);

  expect(session.initialize).toHaveBeenCalled();
  expect(session.markStale).toHaveBeenCalledWith(builderNamespaces);
});

test("adapts MCP upload asset input to public API upload input", () => {
  const input = __testing__.getMcpOperationInput("upload-asset", {
    asset: {
      name: "image.png",
      type: "image",
      format: "png",
      meta: { width: 1200, height: 630 },
    },
    assetsDir: ".webstudio/assets",
  });

  expect(input).toMatchObject({
    asset: { name: "image.png" },
  });
  expect(input).toHaveProperty("readAssetData", expect.any(Function));
});

test("adapts MCP upload assets input to public API upload input", () => {
  const input = __testing__.getMcpOperationInput("upload-assets", {
    assets: [
      {
        name: "image.png",
        type: "image",
        format: "png",
        meta: { width: 1200, height: 630 },
      },
    ],
    assetsDir: ".webstudio/assets",
  });

  expect(input).toMatchObject({
    assets: [{ name: "image.png" }],
  });
  expect(input).toHaveProperty("readAssetData", expect.any(Function));
});

const createCaptureScreenshotMock = (events: string[]) =>
  vi.fn(async (options) => {
    events.push(`capture:${options.url}`);
    return {
      output: "screenshot.png",
      browser: {
        browser: "chromium" as const,
        path: "/browser",
        source: "path" as const,
      },
      viewport: { width: options.width, height: options.height },
      elapsedMs: 1,
      warnings: [],
    };
  });

test("captures stale path screenshots through the restarted preview server", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(() => ({ url: "http://127.0.0.1:3000/", running: true })),
    startAndWait: vi.fn(async (options) => {
      events.push(`start:${options.cwd}:${options.restart}`);
      return { url: "http://127.0.0.1:3000/", running: true };
    }),
    resolveUrl: vi.fn((path: string) => {
      events.push(`resolve:${path}`);
      return `http://127.0.0.1:3000${path}`;
    }),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    isStale: () => true,
    preparePreview: async () => {
      events.push("prepare");
      return { cwd: "/tmp/generated-preview" };
    },
    captureScreenshot,
  });

  await expect(
    handlers.captureScreenshot({
      path: "/pricing",
      viewport: { width: 1440, height: 900 },
    })
  ).resolves.toMatchObject({
    output: "screenshot.png",
  });

  expect(captureScreenshot).toHaveBeenCalledWith(
    expect.objectContaining({
      browser: "auto",
      url: "http://127.0.0.1:3000/pricing",
    })
  );
  expect(events).toEqual([
    "prepare",
    "start:/tmp/generated-preview:true",
    "resolve:/pricing",
    "capture:http://127.0.0.1:3000/pricing",
  ]);
});

test("captures fresh path screenshots through the running preview server", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(() => ({ url: "http://127.0.0.1:3000/", running: true })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => {
      events.push(`resolve:${path}`);
      return `http://127.0.0.1:3000${path}`;
    }),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview: async () => {
      events.push("prepare");
      return { cwd: "/tmp/generated-preview" };
    },
    captureScreenshot,
  });

  await handlers.captureScreenshot({
    path: "/about",
    viewport: { width: 1440, height: 900 },
  });

  expect(preview.startAndWait).not.toHaveBeenCalled();
  expect(events).toEqual([
    "resolve:/about",
    "capture:http://127.0.0.1:3000/about",
  ]);
});
