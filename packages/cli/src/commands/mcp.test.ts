import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import {
  getInputJsonSchemaMetadata,
  getInputJsonSchemaProperties,
} from "@webstudio-is/sdk";
import {
  createProjectSessionMcpCore,
  getDetailedProjectSessionMcpInputSchema,
  hiddenMcpOperationCommands,
  listProjectSessionMcpTools,
} from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/protocol";
import { updatePersistedMcpCheckpoint } from "./mcp-checkpoint";
import {
  __testing__,
  mcpOptions,
  mcpSingleOpCall,
  prepareMcpProjectSession,
} from "./mcp";

const {
  assertSingleOpCallToolSupported,
  applyMcpRunOptions,
  createMcpResourceErrorPayload,
  createMcpRunCheckpointStopPayload,
  createMcpRunErrorPayload,
  createMcpSingleOpCallErrorPayload,
  createMcpStatusReporter,
  getLoadedProjectSessionSnapshot,
  getMcpOperationInput,
  withTextAssetWriteFeedback,
  reportMcpSingleOpCallTermination,
  reportMcpRunTermination,
  createMcpRunTerminationController,
  parseMcpRunCalls,
  parseMcpRunInput,
  parseMcpSingleOpCallInput,
  validateSingleOpCallInput,
  isMcpToolCallFailure,
  getMcpToolCallError,
  executeMcpRunCall,
  withMcpHost,
} = __testing__;

test("disposes an MCP host when its operation fails", async () => {
  const dispose = vi.fn(async () => undefined);

  await expect(
    withMcpHost(
      async () => ({ dispose }),
      async () => {
        throw new Error("operation failed");
      }
    )
  ).rejects.toThrow("operation failed");
  expect(dispose).toHaveBeenCalledOnce();
});

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

const normalizeMcpJsonValueSchemas = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeMcpJsonValueSchemas);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const object = value as Record<string, unknown>;
  if (
    Object.keys(object).length === 1 &&
    Array.isArray(object.anyOf) &&
    JSON.stringify(object.anyOf) ===
      JSON.stringify([
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        { type: "array", items: {} },
        { type: "object" },
      ])
  ) {
    return {};
  }
  const omitSyntheticTupleItems =
    Array.isArray(object.prefixItems) &&
    object.items !== null &&
    typeof object.items === "object" &&
    Object.keys(object.items).length === 0;
  return Object.fromEntries(
    Object.entries(object)
      .filter(([key]) => omitSyntheticTupleItems === false || key !== "items")
      .map(([key, nestedValue]) => [
        key,
        normalizeMcpJsonValueSchemas(nestedValue),
      ])
  );
};

test("keeps every MCP API tool aligned with its public API contract", () => {
  const toolsByName = new Map(
    listProjectSessionMcpTools(publicApiOperations).map((tool) => [
      tool.name,
      tool,
    ])
  );

  for (const operation of publicApiOperations) {
    if (hiddenMcpOperationCommands.has(operation.command)) {
      expect(toolsByName.has(operation.command), operation.command).toBe(false);
      continue;
    }

    const tool = toolsByName.get(operation.command);
    expect(tool, operation.command).toBeDefined();
    if (tool === undefined) {
      continue;
    }

    const schema = getDetailedProjectSessionMcpInputSchema(tool);
    const transportFields = [
      ...(operation.method === "mutation" && operation.localCapable
        ? ["dryRun"]
        : []),
      ...(operation.requiresConfirm && operation.localCapable
        ? ["confirmDestructive", "confirmationToken"]
        : []),
    ];
    const cliOwnedFields =
      operation.command === "report-issue" ? ["runtime"] : [];
    const schemaMetadata = getInputJsonSchemaMetadata(schema);
    const semanticFields = schemaMetadata.inputFields.filter(
      (field) => transportFields.includes(field) === false
    );
    expect(new Set(semanticFields), operation.command).toEqual(
      new Set(
        operation.inputFields.filter(
          (field) => cliOwnedFields.includes(field) === false
        )
      )
    );

    const apiProperties = getInputJsonSchemaProperties(operation.inputSchema);
    const mcpProperties = getInputJsonSchemaProperties(schema);
    for (const field of operation.inputFields) {
      if (cliOwnedFields.includes(field)) {
        continue;
      }
      const isRepresentationOverride =
        (operation.command === "insert-fragment" &&
          ["parentInstanceId", "fragment"].includes(field)) ||
        (operation.command === "insert-collection" && field === "itemFragment");
      if (isRepresentationOverride) {
        continue;
      }
      expect(
        normalizeMcpJsonValueSchemas(mcpProperties?.[field]),
        `${operation.command}.${field}`
      ).toEqual(apiProperties?.[field]);
    }

    const requiredFields = operation.requiredInputFields.filter(
      (field) => cliOwnedFields.includes(field) === false
    );
    if (
      operation.command === "insert-fragment" &&
      requiredFields.includes("parentInstanceId") === false
    ) {
      requiredFields.push("parentInstanceId");
    }
    expect(
      new Set(schemaMetadata.requiredInputFields),
      operation.command
    ).toEqual(new Set(requiredFields));
  }
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

const getArraySchemasWithoutItems = (schema: unknown): unknown[] => {
  if (schema === null || typeof schema !== "object") {
    return [];
  }
  if (Array.isArray(schema)) {
    return schema.flatMap(getArraySchemasWithoutItems);
  }
  const object = schema as Record<string, unknown>;
  return [
    ...(object.type === "array" &&
    object.items === undefined &&
    object.prefixItems === undefined
      ? [object]
      : []),
    ...Object.values(object).flatMap(getArraySchemasWithoutItems),
  ];
};

test("configures MCP commands and options", () => {
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
  expect(yargs.option).toHaveBeenCalledWith(
    "tool-name-format",
    expect.objectContaining({
      choices: ["canonical", "underscores"],
      default: "canonical",
    })
  );

  expect(yargs.command).toHaveBeenCalledWith(
    ["single-op-call <tool> [input]"],
    expect.any(String),
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
    expect.any(Object)
  );
  const runBuilder = commandCalls.find(
    (call) => call[0][0] === "run <input>"
  )?.[2];
  const runYargs = {
    positional: vi.fn(() => runYargs),
    option: vi.fn(() => runYargs),
  };
  runBuilder?.(runYargs as never);
  expect(runYargs.option).toHaveBeenCalledWith("dry-run", expect.any(Object));
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
    expect.any(String),
    expect.any(Function),
    expect.any(Function)
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["list-tools"],
    expect.any(String),
    expect.any(Function),
    expect.any(Function)
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["list-resources"],
    expect.any(String),
    expect.any(Function),
    expect.any(Function)
  );
  expect(yargs.command).toHaveBeenCalledWith(
    ["read-resource <uri>"],
    expect.any(String),
    expect.any(Function),
    expect.any(Function)
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
      message:
        "Audit input is invalid.\npagePath: pageId and pagePath are mutually exclusive (use_page_id_or_page_path).",
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

test("reports termination while inserting a styled nested SVG", async () => {
  const operation = publicApiOperations.find(
    ({ command }) => command === "insert-fragment"
  );
  if (operation === undefined) {
    throw new Error("Expected insert-fragment operation");
  }
  const executeOperation = vi.fn(async () => {
    throw new Error("Simulated interrupted operation");
  });
  const core = createProjectSessionMcpCore({
    operations: [operation],
    createProjectSession: () => {
      throw new Error("insert-fragment must use executeOperation");
    },
    executeOperation,
  });
  const fragment = `<ws.element ws:tag="a">
    <ws.element ws:tag="svg" ws:style={css\`pointer-events: none;\`}>
      <ws.element ws:tag="path" />
    </ws.element>
  </ws.element>`;

  await expect(
    core.callTool({
      name: "insert-fragment",
      input: { parentInstanceId: "body", fragment },
      dryRun: true,
    })
  ).rejects.toThrow("Simulated interrupted operation");
  expect(executeOperation).toHaveBeenCalledOnce();

  const writeResult = vi.fn();
  const setExitCode = vi.fn();
  reportMcpSingleOpCallTermination({
    termination: { type: "signal", signal: "SIGTERM" },
    tool: "insert-fragment",
    elapsedMs: 123,
    writeStatus: vi.fn(),
    writeResult,
    setExitCode,
  });

  expect(writeResult).toHaveBeenCalledWith({
    ok: false,
    error: {
      code: "MCP_CALL_TERMINATED",
      message:
        "MCP single-op-call insert-fragment terminated before returning a result.",
    },
    meta: {
      elapsedMs: 123,
      termination: { type: "signal", signal: "SIGTERM" },
    },
  });
  expect(setExitCode).not.toHaveBeenCalled();
});

test("installs termination reporting for an active MCP single-op call", async () => {
  const previousExitCode = process.exitCode;
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  const stderrWrite = vi
    .spyOn(process.stderr, "write")
    .mockImplementation(() => true);

  try {
    const call = mcpSingleOpCall({
      tool: "insert-fragment",
      input: "{invalid-json",
      dryRun: true,
    });
    process.emit("beforeExit", 0);
    await expect(call).rejects.toBeDefined();

    const results = consoleInfo.mock.calls.map(([output]) =>
      JSON.parse(String(output))
    );
    expect(results).toEqual([
      {
        ok: false,
        error: {
          code: "MCP_CALL_TERMINATED",
          message:
            "MCP single-op-call insert-fragment terminated before returning a result.",
        },
        meta: {
          elapsedMs: expect.any(Number),
          termination: { type: "beforeExit", exitCode: 0 },
        },
      },
    ]);
    expect(stderrWrite).toHaveBeenCalledWith(
      "[webstudio mcp] single-op-call insert-fragment terminated: MCP single-op-call insert-fragment terminated before returning a result.\n"
    );
    expect(process.exitCode).toBe(1);
  } finally {
    process.exitCode = previousExitCode;
  }
});

test("preserves completed calls when a run terminates during an asset query preview", () => {
  const completedResults = [
    "status",
    "list-assets",
    "get-asset-field-catalog",
  ].map((tool) => ({
    tool,
    ok: true,
    structuredContent: { ok: true, data: {}, meta: {} },
  }));

  const writeResult = vi.fn();
  const setExitCode = vi.fn();
  reportMcpRunTermination({
    termination: { type: "beforeExit", exitCode: 0 },
    activeCall: { number: 4, tool: "preview-asset-query" },
    totalCalls: 4,
    results: completedResults,
    elapsedMs: 123,
    writeStatus: vi.fn(),
    writeResult,
    setExitCode,
  });

  expect(writeResult).toHaveBeenCalledWith({
    ok: false,
    error: {
      code: "MCP_RUN_TERMINATED",
      message:
        "MCP run terminated before call 4/4 preview-asset-query returned a result.",
    },
    data: {
      completedCalls: 3,
      unfinishedCall: { number: 4, tool: "preview-asset-query" },
      totalCalls: 4,
      results: completedResults,
    },
    meta: {
      elapsedMs: 123,
      termination: { type: "beforeExit", exitCode: 0 },
    },
  });
  expect(setExitCode).toHaveBeenCalledWith(1);
});

test("identifies a signal that terminates preview.start", () => {
  const writeResult = vi.fn();
  const setExitCode = vi.fn();
  const options = {
    termination: { type: "signal" as const, signal: "SIGTERM" as const },
    activeCall: { number: 1, tool: "preview.start" },
    totalCalls: 4,
    results: [],
    elapsedMs: 123,
    writeStatus: vi.fn(),
    writeResult,
    setExitCode,
  };

  reportMcpRunTermination(options);

  expect(writeResult).toHaveBeenCalledWith({
    ok: false,
    error: {
      code: "MCP_RUN_TERMINATED",
      message:
        "MCP run terminated before call 1/4 preview.start returned a result.",
    },
    data: {
      completedCalls: 0,
      unfinishedCall: { number: 1, tool: "preview.start" },
      totalCalls: 4,
      results: [],
    },
    meta: {
      elapsedMs: 123,
      termination: { type: "signal", signal: "SIGTERM" },
    },
  });
  expect(setExitCode).not.toHaveBeenCalled();
});

test("disposes the preview owner before completing signal termination", async () => {
  const disposeHost = vi.fn(async () => undefined);
  const reportTermination = vi.fn();
  const exitWithSignal = vi.fn();
  const controller = createMcpRunTerminationController({
    getActiveCall: () => ({ number: 1, tool: "preview.start" }),
    totalCalls: 4,
    results: [],
    startedAt: Date.now(),
    disposeHost,
    reportTermination,
    exitWithSignal,
  });

  controller.signal("SIGTERM");
  await vi.waitFor(() => expect(exitWithSignal).toHaveBeenCalledOnce());
  controller.signal("SIGINT");

  expect(reportTermination).toHaveBeenCalledWith(
    expect.objectContaining({
      termination: { type: "signal", signal: "SIGTERM" },
      activeCall: { number: 1, tool: "preview.start" },
      totalCalls: 4,
      results: [],
    })
  );
  expect(disposeHost).toHaveBeenCalledOnce();
  expect(exitWithSignal).toHaveBeenCalledWith("SIGTERM");
});

test("completes signal termination when preview cleanup stalls", async () => {
  const exitWithSignal = vi.fn();
  const controller = createMcpRunTerminationController({
    getActiveCall: () => ({ number: 1, tool: "preview.start" }),
    totalCalls: 4,
    results: [],
    startedAt: Date.now(),
    disposeHost: () => new Promise<never>(() => undefined),
    reportTermination: vi.fn(),
    cleanupTimeout: 1,
    exitWithSignal,
  });

  controller.signal("SIGTERM");

  await vi.waitFor(() =>
    expect(exitWithSignal).toHaveBeenCalledWith("SIGTERM")
  );
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
      folderId: "campaign",
      meta: { width: 1200, height: 630 },
    },
    assetsDir: ".webstudio/assets",
  });

  expect(input).toMatchObject({
    asset: { name: "image.png", folderId: "campaign" },
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

test("adapts MCP asset content input to the shared revision client", async () => {
  const input = getMcpOperationInput("update-asset-content", {
    assetId: "asset-id",
    expectedName: "settings_hash.json",
    extension: "json",
    content: '{"theme":"dark"}',
  }) as {
    assetId: string;
    expectedName: string;
    extension?: string;
    readAssetData: () => Promise<unknown>;
  };

  expect(input).toMatchObject({
    assetId: "asset-id",
    expectedName: "settings_hash.json",
    extension: "json",
  });
  await expect(input.readAssetData()).resolves.toBe('{"theme":"dark"}');
});

test("returns diagnostics without rejecting an invalid MDX Asset write", async () => {
  const source = "# Kept\n\n<ws.element";
  const operationInput = getMcpOperationInput("update-asset-content", {
    assetId: "asset-id",
    expectedName: "article_hash.mdx",
    content: source,
  });

  await expect(
    withTextAssetWriteFeedback({
      command: "update-asset-content",
      input: {
        assetId: "asset-id",
        expectedName: "article_hash.mdx",
        content: source,
      },
      operationInput,
      result: { result: { assetId: "asset-id" } },
    })
  ).resolves.toEqual({
    result: {
      assetId: "asset-id",
      source,
      diagnostics: [
        expect.objectContaining({
          code: "invalid-mdx",
          severity: "error",
        }),
      ],
    },
  });
});

test("returns every Markdown frontmatter diagnostic after an Asset write", async () => {
  const source = "---\na: 1\na: 2\nb: 1\nb: 2\n---\n\n# Kept\n";
  const operationInput = getMcpOperationInput("update-asset-content", {
    assetId: "asset-id",
    expectedName: "article_hash.md",
    content: source,
  });

  const response = await withTextAssetWriteFeedback({
    command: "update-asset-content",
    input: {
      assetId: "asset-id",
      expectedName: "article_hash.md",
      content: source,
    },
    operationInput,
    result: { result: { assetId: "asset-id" } },
  });

  expect(response.result).toMatchObject({
    assetId: "asset-id",
    source,
    diagnostics: [
      { code: "FRONTMATTER_INVALID", severity: "warning", line: 3 },
      { code: "FRONTMATTER_INVALID", severity: "warning", line: 5 },
    ],
  });
});

test("returns source diagnostics for every Markdown and MDX upload", async () => {
  const markdown = "---\na: 1\na: 2\n---\n";
  const mdx = "{first()}\n\n{second()}\n";
  const assets = [
    { name: "article.md", type: "file", format: "md", meta: {} },
    { name: "page.mdx", type: "file", format: "mdx", meta: {} },
  ];
  const operationInput = {
    assets,
    readAssetData: async (asset: { name: string }) =>
      asset.name === "article.md" ? markdown : mdx,
  };

  const response = await withTextAssetWriteFeedback({
    command: "upload-assets",
    input: { assets },
    operationInput,
    result: { result: { uploaded: [] } },
  });

  expect(response.result).toMatchObject({
    sourceDiagnostics: [
      {
        index: 0,
        name: "article.md",
        diagnostics: [
          { code: "FRONTMATTER_INVALID", severity: "warning", line: 3 },
        ],
      },
      {
        index: 1,
        name: "page.mdx",
        diagnostics: [
          { code: "unsafe-mdx", severity: "warning" },
          { code: "unsafe-mdx", severity: "warning" },
        ],
      },
    ],
  });
});

test("validates query setup with the same schema before calling MCP", () => {
  const filter = { field: ["id"], operator: "eq", value: "asset" };
  let nestedWhere: unknown = filter;
  for (let depth = 0; depth < 9; depth += 1) {
    nestedWhere = { all: [nestedWhere] };
  }
  const invalidQueries: Array<[string, unknown]> = [
    ["missing query", {}],
    ["unknown query key", { query: { unknown: true } }],
    ["result mode", { query: { result: "middle" } }],
    ["where shape", { query: { where: {} } }],
    [
      "filter count",
      { query: { where: { all: Array.from({ length: 33 }, () => filter) } } },
    ],
    ["filter depth", { query: { where: nestedWhere } }],
    [
      "empty field path",
      { query: { where: { all: [{ ...filter, field: [] }] } } },
    ],
    [
      "deep field path",
      {
        query: {
          where: {
            all: [{ ...filter, field: Array.from({ length: 10 }, () => "x") }],
          },
        },
      },
    ],
    [
      "bare properties field",
      { query: { where: { all: [{ ...filter, field: ["properties"] }] } } },
    ],
    [
      "unsupported standard field",
      { query: { where: { all: [{ ...filter, field: ["bogus"] }] } } },
    ],
    [
      "operator",
      { query: { where: { all: [{ ...filter, operator: "matches" }] } } },
    ],
    [
      "in value",
      {
        query: {
          where: { all: [{ field: ["id"], operator: "in", value: "asset" }] },
        },
      },
    ],
    [
      "in value count",
      {
        query: {
          where: {
            all: [
              {
                field: ["id"],
                operator: "in",
                value: Array.from({ length: 1_001 }, () => "asset"),
              },
            ],
          },
        },
      },
    ],
    [
      "boolean operator value",
      {
        query: {
          where: {
            all: [{ field: ["id"], operator: "exists", value: "yes" }],
          },
        },
      },
    ],
    [
      "sort count",
      {
        query: {
          sort: Array.from({ length: 9 }, () => ({
            field: ["id"],
            direction: "asc",
          })),
        },
      },
    ],
    [
      "sort direction",
      { query: { sort: [{ field: ["id"], direction: "up" }] } },
    ],
    ["first without sort", { query: { result: "first" } }],
    [
      "empty output",
      {
        query: {
          output: { mode: "fields", includeMetadata: false, fields: [] },
          content: { mode: "none" },
        },
      },
    ],
    [
      "duplicate output fields",
      {
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: [["id"], ["id"]],
          },
        },
      },
    ],
    [
      "output field count",
      {
        query: {
          output: {
            mode: "fields",
            includeMetadata: false,
            fields: Array.from({ length: 257 }, (_, index) => [
              "properties",
              String(index),
            ]),
          },
        },
      },
    ],
    ["negative limit", { query: { limit: -1 } }],
    ["fractional limit", { query: { limit: 1.5 } }],
    ["large limit", { query: { limit: 1_001 } }],
    ["negative offset", { query: { offset: -1 } }],
    ["fractional offset", { query: { offset: 1.5 } }],
    ["large offset", { query: { offset: 1_001 } }],
    ["content mode", { query: { content: { mode: "body" } } }],
    [
      "full content bytes",
      { query: { content: { mode: "full", maxBytes: 0 } } },
    ],
    [
      "large full content",
      { query: { content: { mode: "full", maxBytes: 1_048_577 } } },
    ],
    [
      "range offset",
      { query: { content: { mode: "range", offset: -1, length: 1 } } },
    ],
    [
      "range length",
      { query: { content: { mode: "range", offset: 0, length: 0 } } },
    ],
    [
      "large range",
      { query: { content: { mode: "range", offset: 0, length: 262_145 } } },
    ],
    ["empty index revision", { query: {}, indexRevision: "" }],
    ["large index revision", { query: {}, indexRevision: "x".repeat(256) }],
  ];

  for (const [label, input] of invalidQueries) {
    if (label.includes("index revision")) {
      expect(
        () => getMcpOperationInput("preview-asset-query", input),
        label
      ).toThrow();
      continue;
    }
    expect(
      () => getMcpOperationInput("validate-asset-query", input),
      label
    ).toThrow();
    expect(
      () => getMcpOperationInput("preview-asset-query", input),
      label
    ).toThrow();
  }
});

test("formats local query schema failures as structured MCP input errors", () => {
  let error: unknown;
  try {
    getMcpOperationInput("validate-asset-query", {
      query: {
        result: "first",
        limit: -1,
        output: { mode: "fields", includeMetadata: false, fields: [] },
        content: { mode: "none" },
      },
    });
  } catch (caught) {
    error = caught;
  }

  expect(createMcpSingleOpCallErrorPayload({ error, elapsedMs: 1 })).toEqual({
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message: expect.stringContaining("query.limit"),
      issues: [
        expect.objectContaining({ path: ["query", "limit"] }),
        expect.objectContaining({ path: ["query"] }),
        expect.objectContaining({ path: ["query", "sort"] }),
      ],
    },
    meta: { elapsedMs: 1 },
  });
});

test("exposes asset content editing through MCP discovery", () => {
  const tool = listProjectSessionMcpTools(publicApiOperations).find(
    ({ name }) => name === "update-asset-content"
  );

  expect(tool).toMatchObject({
    name: "update-asset-content",
    inputSchema: {
      required: ["assetId", "expectedName"],
      oneOf: [{ required: ["path"] }, { required: ["content"] }],
      properties: {
        assetId: expect.any(Object),
        expectedName: expect.any(Object),
        extension: expect.any(Object),
        path: expect.any(Object),
        content: expect.any(Object),
      },
    },
  });
});

test("exposes a client-valid update-props schema", () => {
  const tool = listProjectSessionMcpTools(publicApiOperations).find(
    ({ name }) => name === "update-props"
  );

  expect(tool).toBeDefined();
  expect(getArraySchemasWithoutItems(tool?.inputSchema)).toEqual([]);
});
