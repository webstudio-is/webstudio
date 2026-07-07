import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
import { __testing__, mcpOptions, prepareMcpProjectSession } from "./mcp";

const tempDirs: string[] = [];
type CommandBuilder = (yargs: unknown) => unknown;
type CommandCall = [readonly string[], string, CommandBuilder, unknown];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

test("documents MCP stdio startup and discovery tools", () => {
  const yargs = {
    command: vi.fn(() => yargs),
    example: vi.fn(() => yargs),
    epilogue: vi.fn(() => yargs),
  };

  mcpOptions(yargs as never);

  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp",
    "Run a local MCP server over stdio for the configured Webstudio project"
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["single-op-call <tool> [input]"],
    "Call one MCP tool in a fresh CLI process for debugging",
    expect.any(Function),
    expect.any(Function)
  );
  const commandCalls = vi.mocked(yargs.command).mock
    .calls as unknown as CommandCall[];
  const singleOpBuilder = commandCalls.find(
    (call) => call[0][0] === "single-op-call <tool> [input]"
  )?.[2];
  const singleOpYargs = {
    positional: vi.fn(() => singleOpYargs),
    option: vi.fn(() => singleOpYargs),
  };
  singleOpBuilder?.(singleOpYargs as never);
  expect(singleOpYargs.positional).toHaveBeenCalledWith(
    "tool",
    expect.objectContaining({
      describe: expect.stringContaining("insert-fragment"),
    })
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["run <input>"],
    "Run multiple MCP tool calls in one shared CLI session from JSON or a file",
    expect.any(Function),
    expect.any(Function)
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["list-tools"],
    "Print the concise MCP tool catalog as JSON",
    expect.any(Function),
    expect.any(Function)
  );
  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp single-op-call meta.index",
    "Debug one MCP tool without writing a stdio client script"
  );
  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp list-tools",
    "Print the concise MCP tool catalog"
  );
  expect(yargs.example).toHaveBeenCalledWith(
    '$0 mcp run \'[{"tool":"components.find","input":{"brief":"button"}}]\'',
    "Run a small multi-step MCP workflow from inline JSON"
  );
  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp run .temp/mcp-calls.json",
    "Run a larger bounded multi-step MCP workflow from a file"
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
    expect.stringContaining("linked Webstudio project root")
  );
  expect(yargs.epilogue).toHaveBeenCalledWith(
    expect.stringContaining("webstudio://project/guide")
  );
});

test("marks cached namespaces stale before serving MCP tools", async () => {
  const session = {
    snapshot: undefined,
    initialize: vi.fn(async () => undefined),
    markStale: vi.fn(async () => undefined),
  };

  await prepareMcpProjectSession(session);

  expect(session.initialize).toHaveBeenCalled();
  expect(session.markStale).toHaveBeenCalledWith(builderNamespaces);
});

test("preview session materialization uses the loaded local snapshot", () => {
  const snapshot = { projectId: "project", version: 42 };

  expect(
    __testing__.getLoadedProjectSessionSnapshot({
      snapshot: snapshot as never,
      initialize: vi.fn(),
      markStale: vi.fn(),
    })
  ).toBe(snapshot);

  expect(() =>
    __testing__.getLoadedProjectSessionSnapshot({
      snapshot: undefined,
      initialize: vi.fn(),
      markStale: vi.fn(),
    })
  ).toThrow("Project session snapshot is not loaded");
});

test("reports sparse MCP startup status lines for agents", () => {
  const lines: string[] = [];
  const reporter = __testing__.createMcpStatusReporter((line) => {
    lines.push(line);
  });

  reporter.starting();
  reporter.sessionReady();
  reporter.ready(12);

  expect(lines).toEqual([
    `[webstudio mcp] starting stdio server from ${process.cwd()}`,
    "[webstudio mcp] project session initialized; cached namespaces marked stale",
    "[webstudio mcp] ready with 12 tools; use tools/list, meta.index, or webstudio://project/guide; waiting for JSON-RPC on stdin",
  ]);
});

test("parses empty MCP single-op-call input as an empty argument object", async () => {
  await expect(__testing__.parseMcpSingleOpCallInput({})).resolves.toEqual({});
});

test("parses inline MCP single-op-call JSON input", async () => {
  await expect(
    __testing__.parseMcpSingleOpCallInput({
      input: '{"brief":"radix select"}',
    })
  ).resolves.toEqual({ brief: "radix select" });
});

test("parses MCP single-op-call JSON input from a file", async () => {
  const dir = await mkdtemp(
    path.join(tmpdir(), "webstudio-mcp-single-op-call-")
  );
  tempDirs.push(dir);
  const file = path.join(dir, "input.json");
  await writeFile(file, '{"component":"Box"}');

  await expect(
    __testing__.parseMcpSingleOpCallInput({ inputFile: file })
  ).resolves.toEqual({ component: "Box" });
});

test("rejects ambiguous MCP single-op-call input sources", async () => {
  await expect(
    __testing__.parseMcpSingleOpCallInput({
      input: "{}",
      inputFile: "input.json",
    })
  ).rejects.toThrow("Use either input or --input-file, not both.");
});

test("reports invalid MCP single-op-call JSON with a stable error code", async () => {
  await expect(
    __testing__.parseMcpSingleOpCallInput({
      input: "{bad-json",
    })
  ).rejects.toMatchObject({
    code: "INVALID_JSON",
    message: expect.stringContaining(
      "MCP single-op-call input must be valid JSON"
    ),
  });
});

test("rejects long-lived preview tools in MCP single-op-call", () => {
  expect(() =>
    __testing__.assertSingleOpCallToolSupported("preview.start")
  ).toThrow("preview.start is long-lived");
  expect(() => {
    try {
      __testing__.assertSingleOpCallToolSupported("preview.start");
    } catch (error) {
      expect(error).toMatchObject({ code: "BAD_REQUEST" });
      throw error;
    }
  }).toThrow();

  expect(() =>
    __testing__.assertSingleOpCallToolSupported("preview.stop")
  ).toThrow("preview.stop can only stop a preview owned by the same");
  expect(() => {
    try {
      __testing__.assertSingleOpCallToolSupported("preview.stop");
    } catch (error) {
      expect(error).toMatchObject({ code: "BAD_REQUEST" });
      throw error;
    }
  }).toThrow();

  expect(() =>
    __testing__.assertSingleOpCallToolSupported("preview.status")
  ).not.toThrow();
});

test("parses MCP run call arrays", () => {
  expect(
    __testing__.parseMcpRunCalls([
      { tool: "components.coverage-plan" },
      { tool: "checkpoint.ack", input: { reported: true } },
      { tool: "components.find", input: { brief: "button" }, dryRun: true },
    ])
  ).toEqual([
    { tool: "components.coverage-plan", input: {}, dryRun: false },
    {
      tool: "checkpoint.ack",
      input: { reported: true },
      dryRun: false,
    },
    {
      tool: "components.find",
      input: { brief: "button" },
      dryRun: true,
    },
  ]);
});

test("parses MCP run call objects", () => {
  expect(
    __testing__.parseMcpRunCalls({
      calls: [
        {
          tool: "insert-component",
          input: { parentInstanceId: "body", component: "Box" },
          "dry-run": true,
        },
      ],
    })
  ).toEqual([
    {
      tool: "insert-component",
      input: { parentInstanceId: "body", component: "Box" },
      dryRun: true,
    },
  ]);
});

test("persists MCP checkpoints across single-op-call processes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-checkpoint-"));
  tempDirs.push(dir);

  await __testing__.updatePersistedMcpCheckpoint({
    tool: "components.coverage-plan",
    projectRoot: dir,
    structuredContent: {
      data: {
        checkpoint: {
          required: true,
          instruction:
            "Stop after this coverage-plan response and report before continuing.",
        },
      },
    },
  });

  await expect(__testing__.readPersistedMcpCheckpoint(dir)).resolves.toEqual({
    tool: "components.coverage-plan",
    message:
      "Stop after this coverage-plan response and report before continuing.",
  });
  await expect(
    __testing__.assertPersistedMcpCheckpointAcknowledged("components.get", dir)
  ).rejects.toThrow("CHECKPOINT_REQUIRED");
  await expect(
    __testing__.assertPersistedMcpCheckpointAcknowledged("checkpoint.ack", dir)
  ).resolves.toBeUndefined();

  await __testing__.updatePersistedMcpCheckpoint({
    tool: "checkpoint.ack",
    projectRoot: dir,
    structuredContent: { data: { acknowledged: true } },
  });

  await expect(
    __testing__.readPersistedMcpCheckpoint(dir)
  ).resolves.toBeUndefined();
  await expect(
    __testing__.assertPersistedMcpCheckpointAcknowledged("components.get", dir)
  ).resolves.toBeUndefined();
});

test("formats MCP run checkpoint stops with partial results", () => {
  const result = __testing__.createMcpRunCheckpointStopPayload({
    checkpoint: {
      tool: "components.coverage-plan",
      message:
        "Stop after this coverage-plan response and report before continuing.",
    },
    completedCalls: 1,
    totalCalls: 3,
    results: [
      {
        tool: "components.coverage-plan",
        ok: true,
        structuredContent: {
          data: {
            checkpoint: {
              required: true,
            },
          },
        },
      },
    ],
    elapsedMs: 123,
  });

  expect(result).toEqual({
    ok: false,
    error: {
      code: "CHECKPOINT_REQUIRED",
      message:
        'Stop after this coverage-plan response and report before continuing. Report the checkpoint to the parent/user, then call checkpoint.ack {"reported":true} before continuing this run.',
    },
    data: {
      completedCalls: 1,
      stoppedAfterCall: 1,
      totalCalls: 3,
      results: [
        {
          tool: "components.coverage-plan",
          ok: true,
          structuredContent: {
            data: {
              checkpoint: {
                required: true,
              },
            },
          },
        },
      ],
    },
    meta: {
      elapsedMs: 123,
    },
  });
});

test("formats MCP single-op-call failures as structured JSON payloads", () => {
  const error = Object.assign(new Error("Instance not found"), {
    code: "NOT_FOUND",
  });

  expect(
    __testing__.createMcpSingleOpCallErrorPayload({
      error,
      elapsedMs: 123,
    })
  ).toEqual({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Instance not found",
    },
    meta: {
      elapsedMs: 123,
    },
  });
});

test("formats MCP run failures as structured JSON payloads", () => {
  const error = Object.assign(new Error("Invalid JSON"), {
    code: "INVALID_JSON",
  });

  expect(
    __testing__.createMcpRunErrorPayload({
      error,
      completedCalls: 0,
      totalCalls: 0,
      results: [],
      elapsedMs: 12,
    })
  ).toEqual({
    ok: false,
    error: {
      code: "INVALID_JSON",
      message: "Invalid JSON",
    },
    data: {
      completedCalls: 0,
      totalCalls: 0,
      results: [],
    },
    meta: {
      elapsedMs: 12,
    },
  });
});

test("preserves already structured MCP run errors", () => {
  expect(
    __testing__.createMcpRunErrorPayload({
      error: {
        code: "MCP_TOOL_FAILED",
        message:
          "Preview server exited before it became ready at http://127.0.0.1:5192/.",
      },
      completedCalls: 0,
      failedCall: 1,
      totalCalls: 2,
      results: [],
      elapsedMs: 12,
    })
  ).toEqual({
    ok: false,
    error: {
      code: "MCP_TOOL_FAILED",
      message:
        "Preview server exited before it became ready at http://127.0.0.1:5192/.",
    },
    data: {
      completedCalls: 0,
      failedCall: 1,
      totalCalls: 2,
      results: [],
    },
    meta: {
      elapsedMs: 12,
    },
  });
});

test("persists checkpoint producer tool name", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-checkpoint-"));
  tempDirs.push(dir);

  await __testing__.updatePersistedMcpCheckpoint({
    tool: "future.checkpoint-tool",
    projectRoot: dir,
    structuredContent: {
      data: {
        checkpoint: {
          required: true,
          instruction: "Report this future checkpoint before continuing.",
        },
      },
    },
  });

  await expect(
    __testing__.readPersistedMcpCheckpoint(dir)
  ).resolves.toMatchObject({
    tool: "future.checkpoint-tool",
  });
});

test("parses inline MCP run JSON input", async () => {
  await expect(
    __testing__.parseMcpRunInput(
      '[{"tool":"components.find","input":{"brief":"button"}}]'
    )
  ).resolves.toEqual([
    {
      tool: "components.find",
      input: { brief: "button" },
      dryRun: false,
    },
  ]);
});

test("parses MCP run JSON input from a file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-run-"));
  tempDirs.push(dir);
  const file = path.join(dir, "calls.json");
  await writeFile(
    file,
    '{"calls":[{"tool":"components.find","input":{"brief":"button"}}]}'
  );

  await expect(__testing__.parseMcpRunInput(file)).resolves.toEqual([
    {
      tool: "components.find",
      input: { brief: "button" },
      dryRun: false,
    },
  ]);
});

test("rejects invalid MCP run inputs", () => {
  expect(() => __testing__.parseMcpRunCalls({})).toThrow(
    'MCP run input must be an array of calls or an object with a "calls" array.'
  );
  expect(() => __testing__.parseMcpRunCalls({ calls: [] })).toThrow(
    "MCP run input must include at least one call."
  );
  expect(() => __testing__.parseMcpRunCalls({ calls: [{}] })).toThrow(
    "MCP run calls[0].tool must be a non-empty string."
  );
});

test("reports resolved path and cwd for missing MCP run files", async () => {
  await expect(
    __testing__.parseMcpRunInput(".temp/missing-mcp-run-file.json")
  ).rejects.toThrow(
    `MCP run input file was not found. Resolved path: ${path.resolve(
      process.cwd(),
      ".temp/missing-mcp-run-file.json"
    )}. Current working directory: ${process.cwd()}.`
  );
});

test("reports invalid MCP run JSON with a stable error code", async () => {
  await expect(__testing__.parseMcpRunInput("{bad-json")).rejects.toMatchObject(
    {
      code: "INVALID_JSON",
      message: expect.stringContaining(
        "MCP run inline input must be valid JSON"
      ),
    }
  );
});

test("reports explicit MCP startup root for agents", () => {
  const lines: string[] = [];
  const reporter = __testing__.createMcpStatusReporter((line) => {
    lines.push(line);
  }, "/workspace/webstudio-builder");

  reporter.starting();

  expect(lines).toEqual([
    "[webstudio mcp] starting stdio server from /workspace/webstudio-builder",
  ]);
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
  const prepareSessionDataFile = vi.fn(async () => {
    events.push("session");
  });
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
  const progress: string[] = [];

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    isStale: () => true,
    preparePreview: async () => {
      events.push("prepare");
      return { cwd: "/tmp/generated-preview" };
    },
    prepareSessionDataFile,
    captureScreenshot,
  });

  await expect(
    handlers.captureScreenshot(
      {
        path: "/pricing",
        source: "session",
        viewport: { width: 1440, height: 900 },
      },
      {
        report: (message) => {
          progress.push(message);
        },
      }
    )
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
  expect(prepareSessionDataFile).not.toHaveBeenCalled();
  expect(progress).toEqual([
    "tool screenshot preparing generated preview project",
    "tool screenshot starting production preview server",
    "tool screenshot capturing http://127.0.0.1:3000/pricing",
  ]);
});

test("passes explicit preview source to preview preparation", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(() => ({ url: "", running: false })),
    startAndWait: vi.fn(async (options) => {
      events.push(`start:${options.cwd}:${options.restart}`);
      return { url: "http://127.0.0.1:3000/", running: true };
    }),
    resolveUrl: vi.fn(),
  };
  const prepareSessionDataFile = vi.fn(async () => undefined);
  const preparePreview = vi.fn(async (source, prepareSessionDataFile) => {
    events.push(`prepare:${source}`);
    await prepareSessionDataFile?.();
    return { cwd: "/tmp/generated-preview" };
  });
  const progress: string[] = [];

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    preparePreview,
    prepareSessionDataFile,
  });

  await handlers.startPreview(
    { source: "session" },
    {
      report: (message) => {
        progress.push(message);
      },
    }
  );

  expect(preparePreview).toHaveBeenCalledWith(
    "session",
    prepareSessionDataFile
  );
  expect(prepareSessionDataFile).toHaveBeenCalledOnce();
  expect(events).toEqual([
    "prepare:session",
    "start:/tmp/generated-preview:true",
  ]);
  expect(progress).toEqual([
    "tool preview.start preparing generated preview project",
    "tool preview.start starting production preview server",
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
  const progress: string[] = [];

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview: async () => {
      events.push("prepare");
      return { cwd: "/tmp/generated-preview" };
    },
    captureScreenshot,
  });

  await handlers.captureScreenshot(
    {
      path: "/about",
      viewport: { width: 1440, height: 900 },
    },
    {
      report: (message) => {
        progress.push(message);
      },
    }
  );

  expect(preview.startAndWait).not.toHaveBeenCalled();
  expect(events).toEqual([
    "resolve:/about",
    "capture:http://127.0.0.1:3000/about",
  ]);
  expect(progress).toEqual([
    "tool screenshot capturing http://127.0.0.1:3000/about",
  ]);
});

test("captures path screenshots through an existing base URL without preview", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn(),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);
  const preparePreview = vi.fn(async () => {
    events.push("prepare");
    return { cwd: "/tmp/generated-preview" };
  });
  const progress: string[] = [];

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    preparePreview,
    captureScreenshot,
  });

  await handlers.captureScreenshot(
    {
      baseUrl: "http://127.0.0.1:5177",
      path: "/design-system",
      viewport: { width: 1440, height: 900 },
    },
    {
      report: (message) => {
        progress.push(message);
      },
    }
  );

  expect(preview.status).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
  expect(preview.resolveUrl).not.toHaveBeenCalled();
  expect(preparePreview).not.toHaveBeenCalled();
  expect(events).toEqual(["capture:http://127.0.0.1:5177/design-system"]);
  expect(progress).toEqual([
    "tool screenshot capturing http://127.0.0.1:5177/design-system",
  ]);
});

test("captures path screenshots through an explicit preview target", async () => {
  const events: string[] = [];
  const preview = {
    status: vi.fn(() => ({ url: "http://127.0.0.1:5173/", running: true })),
    startAndWait: vi.fn(async (options) => {
      events.push(
        `start:${options.cwd}:${options.host}:${options.port}:${options.restart}`
      );
      return { url: "http://127.0.0.1:5175/", running: true };
    }),
    resolveUrl: vi.fn((path: string) => {
      events.push(`resolve:${path}`);
      return `http://127.0.0.1:5175${path}`;
    }),
  };
  const captureScreenshot = createCaptureScreenshotMock(events);
  const preparePreview = vi.fn(async (source: unknown) => {
    events.push(`prepare:${source}`);
    return { cwd: "/tmp/generated-preview" };
  });

  const handlers = __testing__.createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    preparePreview,
    captureScreenshot,
  });

  await handlers.captureScreenshot({
    path: "/design-system",
    source: "session",
    host: "127.0.0.1",
    port: 5175,
    viewport: { width: 1440, height: 900 },
  });

  expect(events).toEqual([
    "prepare:session",
    "start:/tmp/generated-preview:127.0.0.1:5175:true",
    "resolve:/design-system",
    "capture:http://127.0.0.1:5175/design-system",
  ]);
});
