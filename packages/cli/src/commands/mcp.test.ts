import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { __testing__, mcpOptions, prepareMcpProjectSession } from "./mcp";

const {
  assertPersistedMcpCheckpointAcknowledged,
  assertSingleOpCallToolSupported,
  applyMcpRunOptions,
  createMcpPreviewHandlers,
  createMcpResourceErrorPayload,
  createMcpRunCheckpointStopPayload,
  createMcpRunErrorPayload,
  createMcpSingleOpCallErrorPayload,
  createMcpStatusReporter,
  getLoadedProjectSessionSnapshot,
  getMcpOperationInput,
  parseMcpRunCalls,
  parseMcpRunInput,
  parseMcpSingleOpCallInput,
  validateSingleOpCallInput,
  isMcpToolCallFailure,
  getMcpToolCallError,
  readPersistedMcpCheckpoint,
  updatePersistedMcpCheckpoint,
} = __testing__;

test("classifies structured MCP tool failures for nonzero CLI exit", () => {
  expect(
    isMcpToolCallFailure({
      isError: true,
      structuredContent: { ok: false },
    })
  ).toBe(true);
  expect(
    isMcpToolCallFailure({
      structuredContent: { ok: false },
    })
  ).toBe(true);
  expect(
    isMcpToolCallFailure({
      structuredContent: { ok: true },
    })
  ).toBe(false);
  expect(
    getMcpToolCallError({
      isError: true,
      structuredContent: {
        ok: false,
        error: { code: "AUDIT_FAILED", message: "Capture failed." },
      },
    })
  ).toEqual({ code: "AUDIT_FAILED", message: "Capture failed." });
});

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
  const runBuilder = commandCalls.find(
    (call) => call[0][0] === "run <input>"
  )?.[2];
  const runYargs = {
    positional: vi.fn(() => runYargs),
    option: vi.fn(() => runYargs),
  };
  runBuilder?.(runYargs as never);
  expect(runYargs.option).toHaveBeenCalledWith(
    "dry-run",
    expect.objectContaining({
      describe: "Run local-capable mutation tools without committing",
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
  expect(yargs.command).toHaveBeenCalledWith(
    ["list-resources"],
    "List the MCP resources available for the configured project",
    expect.any(Function),
    expect.any(Function)
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["read-resource <uri>"],
    "Read one MCP resource by URI",
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
    "$0 mcp list-resources",
    "List available MCP resources"
  );
  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp read-resource webstudio://project/guide",
    "Read the project MCP guide"
  );
  expect(yargs.example).toHaveBeenCalledWith(
    '$0 mcp run \'[{"tool":"components.search","input":{"brief":"button"}}]\'',
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

test("preserves an existing local snapshot before serving MCP tools", async () => {
  const session = {
    snapshot: { version: 42 } as never,
    initialize: vi.fn(async () => undefined),
    markStale: vi.fn(async () => undefined),
  };

  await prepareMcpProjectSession(session);

  expect(session.initialize).toHaveBeenCalled();
  expect(session.markStale).not.toHaveBeenCalled();
});

test("preview session materialization uses the loaded local snapshot", () => {
  const snapshot = { projectId: "project", version: 42 };

  expect(
    getLoadedProjectSessionSnapshot({
      snapshot: snapshot as never,
      initialize: vi.fn(),
      markStale: vi.fn(),
    })
  ).toBe(snapshot);

  expect(() =>
    getLoadedProjectSessionSnapshot({
      snapshot: undefined,
      initialize: vi.fn(),
      markStale: vi.fn(),
    })
  ).toThrow("Project session snapshot is not loaded");
});

test("reports sparse MCP startup status lines for agents", () => {
  const lines: string[] = [];
  const reporter = createMcpStatusReporter((line) => {
    lines.push(line);
  });

  reporter.starting();
  reporter.sessionReady();
  reporter.apiContract({
    clientVersion: "public-api:client",
    serverVersion: "public-api:server",
    supportedOperationIds: new Set(),
    missingServerOperationIds: ["assets.upload"],
    negotiated: true,
  });
  reporter.ready(12);
  reporter.connectionError(new Error("connection reset"));
  reporter.connectionClosed();

  expect(lines).toEqual([
    `[webstudio mcp] starting stdio server from ${process.cwd()}`,
    "[webstudio mcp] project session initialized; existing local snapshot preserved",
    "[webstudio mcp] API contract negotiated: CLI 0.0.0-webstudio-version (public-api:client); server public-api:server; unavailable server procedures: assets.upload",
    "[webstudio mcp] ready with 12 tools; use tools/list, meta.index, or webstudio://project/guide; waiting for JSON-RPC on stdin",
    '[webstudio mcp] lifecycle {"event":"stdio_transport_error","message":"connection reset","recovery":"Reconnect the MCP client. If the error repeats, restart the CLI with npx webstudio@latest mcp."}',
    '[webstudio mcp] lifecycle {"event":"stdio_connection_closed","recovery":"Reconnect the MCP client if this was unexpected."}',
  ]);
});

test("parses empty MCP single-op-call input as an empty argument object", async () => {
  await expect(parseMcpSingleOpCallInput({})).resolves.toEqual({});
});

test("parses inline MCP single-op-call JSON input", async () => {
  await expect(
    parseMcpSingleOpCallInput({
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

  await expect(parseMcpSingleOpCallInput({ inputFile: file })).resolves.toEqual(
    { component: "Box" }
  );
});

test("rejects ambiguous MCP single-op-call input sources", async () => {
  await expect(
    parseMcpSingleOpCallInput({
      input: "{}",
      inputFile: "input.json",
    })
  ).rejects.toThrow("Use either input or --input-file, not both.");
});

test("reports invalid MCP single-op-call JSON with a stable error code", async () => {
  await expect(
    parseMcpSingleOpCallInput({
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
  expect(() => assertSingleOpCallToolSupported("preview.start")).toThrow(
    "preview.start is long-lived"
  );
  expect(() => {
    try {
      assertSingleOpCallToolSupported("preview.start");
    } catch (error) {
      expect(error).toMatchObject({ code: "BAD_REQUEST" });
      throw error;
    }
  }).toThrow();

  expect(() => assertSingleOpCallToolSupported("preview.stop")).toThrow(
    "preview.stop can only stop a preview owned by the same"
  );
  expect(() => {
    try {
      assertSingleOpCallToolSupported("preview.stop");
    } catch (error) {
      expect(error).toMatchObject({ code: "BAD_REQUEST" });
      throw error;
    }
  }).toThrow();

  expect(() => assertSingleOpCallToolSupported("preview.status")).not.toThrow();
});

test("rejects audit input conflicts before creating a project session", () => {
  for (const input of [
    { pageId: "home", pagePath: "/" },
    { rendered: true, cursor: "next" },
  ]) {
    expect(() => validateSingleOpCallInput("audit", input)).toThrow(
      "Audit input is invalid."
    );
    try {
      validateSingleOpCallInput("audit", input);
    } catch (error) {
      expect(error).toMatchObject({
        code: "INVALID_INPUT",
        issues: [
          expect.objectContaining({
            path: expect.any(Array),
            message: expect.any(String),
          }),
        ],
      });
    }
  }
});

test("preserves structured input issues in MCP shell errors", () => {
  expect(
    createMcpSingleOpCallErrorPayload({
      error: Object.assign(new Error("Audit input is invalid."), {
        code: "INVALID_INPUT",
        issues: [
          {
            code: "mutually_exclusive_fields",
            path: ["pagePath"],
            message: "pageId and pagePath are mutually exclusive.",
            constraint: "use_page_id_or_page_path",
          },
        ],
      }),
      elapsedMs: 1,
    })
  ).toMatchObject({
    ok: false,
    error: {
      code: "INVALID_INPUT",
      issues: [
        {
          code: "mutually_exclusive_fields",
          path: ["pagePath"],
          message: "pageId and pagePath are mutually exclusive.",
          constraint: "use_page_id_or_page_path",
        },
      ],
    },
  });
});

test("parses MCP run call arrays", () => {
  expect(
    parseMcpRunCalls([
      { tool: "components.coverage-plan" },
      {
        tool: "checkpoint.ack",
        input: {
          reported: true,
          continueAfterReport: true,
          summary: "reported checkpoint",
        },
      },
      { tool: "components.find", input: { brief: "button" }, dryRun: true },
    ])
  ).toEqual([
    { tool: "components.coverage-plan", input: {}, dryRun: false },
    {
      tool: "checkpoint.ack",
      input: {
        reported: true,
        continueAfterReport: true,
        summary: "reported checkpoint",
      },
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
    parseMcpRunCalls({
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

test("applies batch dry-run to every MCP run call", () => {
  expect(
    applyMcpRunOptions(
      [
        { tool: "components.find", input: { brief: "button" }, dryRun: false },
        {
          tool: "insert-fragment",
          input: { parentInstanceId: "body", fragment: "<ws.element />" },
          dryRun: false,
        },
      ],
      { dryRun: true }
    )
  ).toEqual([
    { tool: "components.find", input: { brief: "button" }, dryRun: true },
    {
      tool: "insert-fragment",
      input: { parentInstanceId: "body", fragment: "<ws.element />" },
      dryRun: true,
    },
  ]);
});

test("persists MCP checkpoints across single-op-call processes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-checkpoint-"));
  tempDirs.push(dir);

  await updatePersistedMcpCheckpoint({
    tool: "components.coverage-plan",
    projectRoot: dir,
    structuredContent: {
      data: {
        checkpoint: {
          required: true,
          instruction:
            "Stop after this coverage-plan response and report before continuing.",
          nextCommand:
            'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\'',
        },
      },
    },
  });

  await expect(readPersistedMcpCheckpoint(dir)).resolves.toEqual({
    tool: "components.coverage-plan",
    message:
      "Stop after this coverage-plan response and report before continuing.",
    nextCommand:
      'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\'',
  });
  await expect(
    assertPersistedMcpCheckpointAcknowledged("components.get", dir)
  ).rejects.toMatchObject({
    code: "CHECKPOINT_REQUIRED",
    message: expect.stringContaining("CHECKPOINT_REQUIRED"),
  });
  await expect(
    assertPersistedMcpCheckpointAcknowledged("checkpoint.ack", dir)
  ).resolves.toBeUndefined();

  await updatePersistedMcpCheckpoint({
    tool: "checkpoint.ack",
    projectRoot: dir,
    structuredContent: { data: { acknowledged: true } },
  });

  await expect(readPersistedMcpCheckpoint(dir)).resolves.toBeUndefined();
  await expect(
    assertPersistedMcpCheckpointAcknowledged("components.get", dir)
  ).resolves.toBeUndefined();
});

test("formats MCP run checkpoint stops with partial results", () => {
  const result = createMcpRunCheckpointStopPayload({
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
        'Stop after this coverage-plan response and report before continuing. Stop now and report the previous checkpoint to the parent/user. Only after the parent/user continues, call checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"} before continuing this run.',
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
    createMcpSingleOpCallErrorPayload({
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

test("formats unknown MCP resource failures as structured JSON", () => {
  expect(
    createMcpResourceErrorPayload(
      new Error('Unknown MCP resource "webstudio://project/unknown".'),
      12
    )
  ).toEqual({
    ok: false,
    error: {
      code: "MCP_RESOURCE_FAILED",
      message: 'Unknown MCP resource "webstudio://project/unknown".',
    },
    meta: { elapsedMs: 12 },
  });
});

test("formats missing Builder API access in MCP single-op-call failures", () => {
  const error = Object.assign(
    new Error("Project owner can't be found for token token-1"),
    { code: "INTERNAL_SERVER_ERROR" }
  );

  expect(
    createMcpSingleOpCallErrorPayload({
      error,
      elapsedMs: 123,
    })
  ).toEqual({
    ok: false,
    error: {
      code: "UNAUTHORIZED",
      message:
        "This project cannot be accessed through the Builder API with the current share link/token. Enable API access in the share-link settings, then relink the project with `webstudio init --link <share-link> --json`.",
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
    createMcpRunErrorPayload({
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
    createMcpRunErrorPayload({
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

  await updatePersistedMcpCheckpoint({
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

  await expect(readPersistedMcpCheckpoint(dir)).resolves.toMatchObject({
    tool: "future.checkpoint-tool",
  });
});

test("parses inline MCP run JSON input", async () => {
  await expect(
    parseMcpRunInput('[{"tool":"components.find","input":{"brief":"button"}}]')
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

  await expect(parseMcpRunInput(file)).resolves.toEqual([
    {
      tool: "components.find",
      input: { brief: "button" },
      dryRun: false,
    },
  ]);
});

test("rejects invalid MCP run inputs", () => {
  expect(() => parseMcpRunCalls({})).toThrow(
    'MCP run input must be an array of calls or an object with a "calls" array.'
  );
  expect(() => parseMcpRunCalls({ calls: [] })).toThrow(
    "MCP run input must include at least one call."
  );
  expect(() => parseMcpRunCalls({ calls: [{}] })).toThrow(
    "MCP run calls[0].tool must be a non-empty string."
  );
});

test("reports resolved path and cwd for missing MCP run files", async () => {
  await expect(
    parseMcpRunInput(".temp/missing-mcp-run-file.json")
  ).rejects.toThrow(
    `MCP run input file was not found. Resolved path: ${path.resolve(
      process.cwd(),
      ".temp/missing-mcp-run-file.json"
    )}. Current working directory: ${process.cwd()}.`
  );
});

test("reports invalid MCP run JSON with a stable error code", async () => {
  await expect(parseMcpRunInput("{bad-json")).rejects.toMatchObject({
    code: "INVALID_JSON",
    message: expect.stringContaining("MCP run inline input must be valid JSON"),
  });
});

test("reports explicit MCP startup root for agents", () => {
  const lines: string[] = [];
  const reporter = createMcpStatusReporter((line) => {
    lines.push(line);
  }, "/workspace/webstudio-builder");

  reporter.starting();

  expect(lines).toEqual([
    "[webstudio mcp] starting stdio server from /workspace/webstudio-builder",
  ]);
});

test("adapts MCP upload asset input to public API upload input", () => {
  const input = getMcpOperationInput("upload-asset", {
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
  const input = getMcpOperationInput("upload-assets", {
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
      fullPage: options.fullPage === true,
      elapsedMs: 1,
      warnings: [],
      layout: {
        viewportWidth: options.width,
        viewportHeight: options.height,
        contentWidth: options.width + 20,
        contentHeight: options.height * 2,
        horizontalOverflow: true,
        images: [],
        resources: [],
      },
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

  const handlers = createMcpPreviewHandlers({
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
    layout: {
      viewportWidth: 1440,
      contentWidth: 1460,
      horizontalOverflow: true,
      images: [],
      resources: [],
    },
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

  const handlers = createMcpPreviewHandlers({
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

test("rejects invalid external image domains before preparing preview", async () => {
  const preview = {
    status: vi.fn(() => ({ url: "", running: false })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn(),
  };
  const preparePreview = vi.fn();
  const handlers = createMcpPreviewHandlers({ preview, preparePreview });

  await expect(
    handlers.startPreview({
      imageDomains: ["https://images.example.com/path"],
    })
  ).rejects.toThrow(
    "Image domains must be hostnames without a protocol or path"
  );
  await expect(
    handlers.captureScreenshot({
      path: "/",
      imageDomains: ["https://images.example.com/path"],
      viewport: { width: 1440, height: 900 },
    })
  ).rejects.toThrow(
    "Image domains must be hostnames without a protocol or path"
  );

  expect(preparePreview).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
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

  const handlers = createMcpPreviewHandlers({
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
      fullPage: true,
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
  expect(captureScreenshot).toHaveBeenCalledWith(
    expect.objectContaining({
      fullPage: true,
    })
  );
  expect(progress).toEqual([
    "tool screenshot capturing http://127.0.0.1:3000/about",
  ]);
});

test("reuses and closes one browser capture session for session screenshots", async () => {
  const preview = {
    status: vi.fn(() => ({ url: "http://127.0.0.1:3000/", running: true })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
    stop: vi.fn(async () => ({ url: "", running: false })),
  };
  const capture = createCaptureScreenshotMock([]);
  const close = vi.fn(async () => undefined);
  const capturePage = vi.fn(async () => []);
  const createCaptureSession = vi.fn(() => ({ capture, capturePage, close }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  await handlers.captureScreenshot({
    path: "/one",
    source: "session",
    viewport: { width: 1440, height: 900 },
  });
  await handlers.captureScreenshot({
    path: "/two",
    source: "session",
    viewport: { width: 390, height: 844 },
  });

  expect(createCaptureSession).toHaveBeenCalledOnce();
  expect(capture).toHaveBeenCalledTimes(2);
  expect(close).not.toHaveBeenCalled();

  await handlers.stopPreview();

  expect(close).toHaveBeenCalledOnce();
  expect(preview.stop).toHaveBeenCalledOnce();
});

test("stops the owned preview when browser capture cleanup fails", async () => {
  const preview = {
    status: vi.fn(() => ({ url: "http://127.0.0.1:3000/", running: true })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
    stop: vi.fn(async () => ({ url: "", running: false })),
  };
  const cleanupError = new Error("browser cleanup failed");
  const createCaptureSession = vi.fn(() => ({
    capture: createCaptureScreenshotMock([]),
    capturePage: vi.fn(async () => []),
    close: vi.fn(async () => {
      throw cleanupError;
    }),
  }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  await handlers.captureScreenshot({
    path: "/one",
    source: "session",
    viewport: { width: 1440, height: 900 },
  });

  await expect(handlers.stopPreview()).rejects.toBe(cleanupError);
  expect(preview.stop).toHaveBeenCalledOnce();
});

test("captures one session page across multiple viewports through resize", async () => {
  const preview = {
    status: vi.fn(() => ({ url: "http://127.0.0.1:3000/", running: true })),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn((path: string) => `http://127.0.0.1:3000${path}`),
  };
  const capture = createCaptureScreenshotMock([]);
  const capturePage = vi.fn(
    async (optionsList) => await Promise.all(optionsList.map(capture))
  );
  const close = vi.fn(async () => undefined);
  const createCaptureSession = vi.fn(() => ({
    capture,
    capturePage,
    close,
  }));
  const handlers = createMcpPreviewHandlers({
    preview,
    isStale: () => false,
    createCaptureSession,
  });

  const results = await handlers.capturePageScreenshots([
    {
      path: "/responsive",
      source: "session",
      viewport: { width: 375, height: 812 },
      waitForTimeout: 0,
    },
    {
      path: "/responsive",
      source: "session",
      viewport: { width: 1440, height: 900 },
      waitForTimeout: 0,
    },
  ]);

  expect(results.map((result) => result.viewport.width)).toEqual([375, 1440]);
  expect(createCaptureSession).toHaveBeenCalledOnce();
  expect(capturePage).toHaveBeenCalledWith([
    expect.objectContaining({
      url: "http://127.0.0.1:3000/responsive",
      width: 375,
      waitForTimeout: 0,
    }),
    expect.objectContaining({
      url: "http://127.0.0.1:3000/responsive",
      width: 1440,
      waitForTimeout: 0,
    }),
  ]);
  expect(preview.startAndWait).not.toHaveBeenCalled();
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

  const handlers = createMcpPreviewHandlers({
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

test("rejects authenticated Builder URLs as generated preview targets", async () => {
  const preview = {
    status: vi.fn(),
    startAndWait: vi.fn(),
    resolveUrl: vi.fn(),
  };
  const captureScreenshot = vi.fn();
  const handlers = createMcpPreviewHandlers({ preview, captureScreenshot });

  await expect(
    handlers.captureScreenshot({
      url: "https://p-project.wstd.dev:5173/?authToken=secret&mode=design",
      viewport: { width: 1440, height: 900 },
    })
  ).rejects.toMatchObject({ code: "BUILDER_URL_IS_NOT_SITE_PREVIEW" });
  await expect(
    handlers.captureScreenshot({
      baseUrl:
        "https://p-project.apps.webstudio.is/?authToken=secret&mode=preview",
      path: "/pricing",
      viewport: { width: 1440, height: 900 },
    })
  ).rejects.toMatchObject({ code: "BUILDER_URL_IS_NOT_SITE_PREVIEW" });

  expect(captureScreenshot).not.toHaveBeenCalled();
  expect(preview.startAndWait).not.toHaveBeenCalled();
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

  const handlers = createMcpPreviewHandlers({
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
