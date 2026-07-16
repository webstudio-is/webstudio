import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { listProjectSessionMcpTools } from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/protocol";
import { __testing__, mcpOptions, prepareMcpProjectSession } from "./mcp";

const {
  assertPersistedMcpCheckpointAcknowledged,
  assertSingleOpCallToolSupported,
  applyMcpRunOptions,
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
  executeMcpRunCall,
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
    option: vi.fn(() => yargs),
    example: vi.fn(() => yargs),
    epilogue: vi.fn(() => yargs),
  };

  mcpOptions(yargs as never);

  expect(yargs.option).toHaveBeenCalledWith(
    "project",
    expect.objectContaining({ type: "string" })
  );

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
  expect(runYargs.option).toHaveBeenCalledWith(
    "approve-mutations",
    expect.objectContaining({ default: false })
  );
  expect(runYargs.option).toHaveBeenCalledWith(
    "concurrency",
    expect.objectContaining({ type: "number" })
  );
  expect(runYargs.option).toHaveBeenCalledWith(
    "resume",
    expect.objectContaining({ default: true })
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["run <input>"],
    "Run an MCP workflow manifest for one or more linked projects",
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
  const tools = listProjectSessionMcpTools(publicApiOperations);
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-checkpoint-"));
  tempDirs.push(dir);

  await updatePersistedMcpCheckpoint({
    tool: "components.coverage-plan",
    scope: { projectRoot: dir },
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

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir })
  ).resolves.toEqual({
    tool: "components.coverage-plan",
    message:
      "Stop after this coverage-plan response and report before continuing.",
    nextCommand:
      'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\'',
  });
  await expect(
    assertPersistedMcpCheckpointAcknowledged("components.get", tools, {
      projectRoot: dir,
    })
  ).resolves.toBeUndefined();
  await expect(
    assertPersistedMcpCheckpointAcknowledged("create-page", tools, {
      projectRoot: dir,
    })
  ).rejects.toMatchObject({
    code: "CHECKPOINT_REQUIRED",
    message: expect.stringContaining("CHECKPOINT_REQUIRED"),
  });
  await expect(
    assertPersistedMcpCheckpointAcknowledged("checkpoint.ack", tools, {
      projectRoot: dir,
    })
  ).resolves.toBeUndefined();

  await updatePersistedMcpCheckpoint({
    tool: "checkpoint.ack",
    scope: { projectRoot: dir },
    structuredContent: { data: { acknowledged: true } },
  });

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir })
  ).resolves.toBeUndefined();
  await expect(
    assertPersistedMcpCheckpointAcknowledged("create-page", tools, {
      projectRoot: dir,
    })
  ).resolves.toBeUndefined();
});

test("isolates persisted MCP checkpoints by selected project", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-projects-"));
  tempDirs.push(dir);
  await updatePersistedMcpCheckpoint({
    tool: "workflow.next",
    scope: { projectRoot: dir, projectId: "project-a" },
    structuredContent: {
      data: { checkpoint: { required: true, instruction: "Report project A" } },
    },
  });

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir, projectId: "project-a" })
  ).resolves.toEqual(expect.objectContaining({ message: "Report project A" }));
  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir, projectId: "project-b" })
  ).resolves.toBeUndefined();
});

test("checks persisted checkpoints before every MCP run call", async () => {
  const dir = await mkdtemp(
    path.join(tmpdir(), "webstudio-mcp-run-checkpoint-")
  );
  tempDirs.push(dir);
  const scope = { projectRoot: dir };
  const tools = listProjectSessionMcpTools(publicApiOperations);
  const callTool = vi.fn(async () => ({
    structuredContent: { ok: true, data: {}, meta: {} },
  }));
  const core = { listTools: () => tools, callTool };
  await updatePersistedMcpCheckpoint({
    tool: "workflow.next",
    scope,
    structuredContent: {
      data: { checkpoint: { required: true, instruction: "Report first" } },
    },
  });

  await expect(
    executeMcpRunCall({
      core: core as never,
      call: { tool: "components.get", input: {}, dryRun: false },
      scope,
    })
  ).resolves.toBeDefined();
  await expect(
    executeMcpRunCall({
      core: core as never,
      call: { tool: "create-page", input: {}, dryRun: false },
      scope,
    })
  ).rejects.toMatchObject({ code: "CHECKPOINT_REQUIRED" });
  expect(callTool).toHaveBeenCalledTimes(1);
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
    scope: { projectRoot: dir },
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
    readPersistedMcpCheckpoint({ projectRoot: dir })
  ).resolves.toMatchObject({
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
