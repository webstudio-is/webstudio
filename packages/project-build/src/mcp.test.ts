import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test, vi } from "vitest";
import {
  createProjectSessionMcpCore,
  createProjectSessionMcpServer,
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
  type PublicMcpOperation,
  type ProjectSessionMcpGuidance,
} from "./mcp";
import type { ProjectSessionEnvelope } from "./project-session";
import { diffPngFiles } from "./visual/screenshot-diff";
import { createPng, paintRect, writePng } from "./visual/screenshot.test-utils";

type CreateProjectSession = NonNullable<
  Parameters<typeof createProjectSessionMcpCore>[0]["createProjectSession"]
>;

type ExecuteOperation = NonNullable<
  Parameters<typeof createProjectSessionMcpCore>[0]["executeOperation"]
>;

type TestSession = ReturnType<CreateProjectSession>;

type TestPublicMcpOperation = Pick<
  PublicMcpOperation,
  "command" | "id" | "description" | "inputFields"
> &
  Partial<PublicMcpOperation>;

const publicOperation = (
  operation: TestPublicMcpOperation
): PublicMcpOperation => ({
  method: "query",
  permit: "view",
  localCapable: true,
  serverOnly: false,
  readNamespaces: [],
  writeNamespaces: [],
  invalidatesNamespaces: [],
  retryOnConflict: false,
  ...operation,
});

const styleOperation = (
  operation: TestPublicMcpOperation & {
    readNamespaces: PublicMcpOperation["readNamespaces"];
  }
): PublicMcpOperation => {
  const arrayField = operation.inputFields.at(-1);
  return publicOperation({
    method: "mutation",
    permit: "edit",
    inputFieldTypes:
      arrayField === undefined ? undefined : { [arrayField]: "array" },
    writeNamespaces: ["styles"],
    invalidatesNamespaces: ["styles"],
    retryOnConflict: true,
    ...operation,
  });
};

const publicMcpOperations: readonly PublicMcpOperation[] = [
  publicOperation({
    command: "list-pages",
    id: "pages.list",
    description: "List pages",
    inputFields: ["includeFolders"],
    readNamespaces: ["pages"],
  }),
  publicOperation({
    command: "whoami",
    id: "auth.me",
    description: "Identify token",
    inputFields: [],
    localCapable: false,
    serverOnly: true,
  }),
  publicOperation({
    command: "publish",
    id: "build.publish",
    method: "mutation",
    permit: "build",
    description: "Publish project",
    inputFields: ["target", "domains"],
    localCapable: false,
    serverOnly: true,
  }),
  publicOperation({
    command: "delete-instance",
    id: "instances.delete",
    method: "mutation",
    permit: "edit",
    description: "Delete instances",
    inputFields: ["instanceIds"],
    inputFieldTypes: { instanceIds: "array" },
    writeNamespaces: ["instances"],
    invalidatesNamespaces: ["instances"],
  }),
  styleOperation({
    command: "update-styles",
    id: "styles.updateDeclarations",
    description: "Update styles",
    inputFields: ["updates"],
    readNamespaces: ["styles"],
  }),
  styleOperation({
    command: "delete-styles",
    id: "styles.deleteDeclarations",
    description: "Delete styles",
    inputFields: ["deletions"],
    readNamespaces: ["styles"],
  }),
  styleOperation({
    command: "update-design-token-styles",
    id: "designTokens.updateStyles",
    description: "Update design token styles",
    inputFields: ["designTokenId", "updates"],
    readNamespaces: ["styleSources", "styles"],
  }),
  styleOperation({
    command: "delete-design-token-styles",
    id: "designTokens.deleteStyles",
    description: "Delete design token styles",
    inputFields: ["designTokenId", "deletions"],
    readNamespaces: ["styleSources", "styles"],
  }),
];

const testMcpGuidance: ProjectSessionMcpGuidance = {
  visualVerificationRule:
    "Verify rendered visual/design work before finishing.",
  getVisionVerificationLoop: ({ includeDiff }) =>
    [
      "Make focused changes.",
      "Start preview.",
      "Install dependencies if missing.",
      'Call screenshot with { path: "/" } or the changed page path.',
      includeDiff ? "Use screenshot.diff when a baseline exists." : undefined,
      "Inspect the PNG with vision.",
    ].filter((step): step is string => step !== undefined),
  getVisionWorkflowSummary: ({ includeDiff }) =>
    includeDiff
      ? "Visual workflow with screenshot diff."
      : "Visual workflow without screenshot diff.",
};

const tesseractInstallUrl =
  "https://tesseract-ocr.github.io/tessdoc/Installation.html";

const createEnvelope = (
  overrides: Partial<ProjectSessionEnvelope> & {
    operationId: string;
    result: unknown;
  }
): ProjectSessionEnvelope => ({
  projectId: "project-1",
  buildId: "build-1",
  version: 1,
  source: "local",
  state: { committed: false, freshness: {} },
  namespaces: {
    read: [],
    write: [],
    invalidated: [],
    missing: [],
  },
  diagnostics: [],
  ...overrides,
});

const createSession = (overrides: Partial<TestSession> = {}): TestSession => ({
  initialize: vi.fn(async () =>
    createEnvelope({
      operationId: "project-session.status",
      result: { loaded: true },
    })
  ),
  refresh: vi.fn(async () =>
    createEnvelope({
      operationId: "project-session.refresh",
      result: { refreshedNamespaces: [] },
    })
  ),
  reset: vi.fn(async () =>
    createEnvelope({
      operationId: "project-session.reset",
      result: { loaded: false },
    })
  ),
  ...overrides,
});

const createSessionFactory = (session = createSession()) =>
  vi.fn(() => session) as CreateProjectSession;

const createExecuteOperation = (
  implementation: ExecuteOperation = async () =>
    createEnvelope({
      operationId: "test.operation",
      result: undefined,
    })
): ExecuteOperation => vi.fn(implementation);

const createConnectedClient = async (
  server: Awaited<ReturnType<typeof createProjectSessionMcpServer>>
) => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
};

describe("project session mcp adapter", () => {
  test("lists tools from the public operation catalog", () => {
    const tools = listProjectSessionMcpTools(publicMcpOperations);

    expect(tools.map((tool) => tool.name)).toEqual([
      ...publicMcpOperations.map((operation) => operation.command),
      "meta.index",
      "meta.guide",
      "meta.get_more_tools",
      "status",
      "refresh",
      "reset-session",
    ]);
    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "list-pages",
          inputSchema: expect.objectContaining({
            properties: {
              includeFolders: {
                description: "Public API input field `includeFolders`.",
              },
            },
          }),
          annotations: expect.objectContaining({
            operationId: "pages.list",
            inputFields: ["includeFolders"],
            localCapable: true,
            serverOnly: false,
            readNamespaces: ["pages"],
          }),
        }),
        expect.objectContaining({
          name: "whoami",
          annotations: expect.objectContaining({
            operationId: "auth.me",
            localCapable: false,
            serverOnly: true,
          }),
        }),
        expect.objectContaining({
          name: "meta.index",
          annotations: expect.objectContaining({
            operationId: "meta.index",
            localCapable: true,
          }),
        }),
        expect.objectContaining({
          name: "refresh",
          inputSchema: expect.objectContaining({
            properties: expect.objectContaining({
              namespaces: expect.objectContaining({
                type: "array",
              }),
            }),
          }),
          annotations: expect.objectContaining({
            operationId: "project-session.refresh",
            localCapable: true,
          }),
        }),
        expect.objectContaining({
          name: "reset-session",
          annotations: expect.objectContaining({
            operationId: "project-session.reset",
          }),
        }),
      ])
    );

    for (const [name, field] of [
      ["delete-instance", "instanceIds"],
      ["update-styles", "updates"],
      ["delete-styles", "deletions"],
      ["update-design-token-styles", "updates"],
      ["delete-design-token-styles", "deletions"],
    ]) {
      expect(
        tools.find((tool) => tool.name === name)?.inputSchema.properties?.[
          field
        ]
      ).toMatchObject({ type: "array" });
    }
  });

  test("lists OCR installer only when host provides installer", () => {
    expect(
      listProjectSessionMcpTools(publicMcpOperations).map((tool) => tool.name)
    ).not.toContain("vision.install-ocr");
    expect(
      listProjectSessionMcpTools(publicMcpOperations, {
        includeInstallOcr: true,
      }).map((tool) => tool.name)
    ).toContain("vision.install-ocr");
  });

  test("lists import only when host provides importer", () => {
    expect(
      listProjectSessionMcpTools(publicMcpOperations).map((tool) => tool.name)
    ).not.toContain("import");
    const tools = listProjectSessionMcpTools(publicMcpOperations, {
      includeImport: true,
    });
    const importTool = tools.find((tool) => tool.name === "import");
    expect(importTool).toBeDefined();
    expect(importTool?.annotations.invalidatesNamespaces).toEqual([]);
    expect(tools.map((tool) => tool.name)).toContain("import");
  });

  test("does not expose CLI-only required options as MCP tool schemas", () => {
    const operationWithCliOptions = {
      ...publicMcpOperations[0]!,
      requiredOptions: ["page", "base-version", "json"],
    };

    expect(listProjectSessionMcpTools([operationWithCliOptions])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "list-pages",
          inputSchema: {
            type: "object",
            description:
              "Pass the public API input object for this tool. Use meta.get_more_tools for examples and required fields.",
            additionalProperties: true,
            properties: {
              includeFolders: {
                description: "Public API input field `includeFolders`.",
              },
            },
          },
        }),
      ])
    );
  });

  test("lists MCP resources for project status and tool catalog", () => {
    expect(listProjectSessionMcpResources()).toEqual([
      expect.objectContaining({ uri: "webstudio://project/status" }),
      expect.objectContaining({ uri: "webstudio://project/tools" }),
      expect.objectContaining({ uri: "webstudio://project/guide" }),
    ]);
  });

  test("calls tools through project session operation executor", async () => {
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "pages.list",
        result: [{ id: "home" }],
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    const result = await adapter.callTool({
      name: "list-pages",
      input: { includeFolders: true },
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "list-pages",
      input: { includeFolders: true },
      dryRun: false,
    });
    expect(result.structuredContent).toEqual({
      ok: true,
      data: [{ id: "home" }],
      meta: {
        session: expect.objectContaining({
          operationId: "pages.list",
          source: "local",
        }),
      },
    });
  });

  test("wraps bare array input for style operation tools", async () => {
    const updates = [
      {
        instanceId: "instance-id",
        property: "box-shadow",
        value: { type: "keyword", value: "none" },
      },
    ];
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "styles.updateDeclarations",
        result: { styleKeys: [] },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "update-styles",
      input: updates,
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "update-styles",
      input: { updates },
      dryRun: false,
    });
  });

  test("wraps bare array input for single-array operation tools", async () => {
    const instanceIds = ["instance-id"];
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "instances.delete",
        result: { instanceIds },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation,
    });

    await adapter.callTool({
      name: "delete-instance",
      input: instanceIds,
    });

    expect(executeOperation).toHaveBeenCalledWith({
      command: "delete-instance",
      input: { instanceIds },
      dryRun: false,
    });
  });

  test("calls import through injected project importer", async () => {
    const importProject = vi.fn(async () => ({ imported: true as const }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      importProject,
    });

    const result = await adapter.callTool({
      name: "import",
      input: {
        to: "https://p-destination.wstd.dev/?authToken=token",
        assetsDir: "assets",
        ignoreVersionCheck: true,
        skipAssets: true,
      },
    });

    expect(importProject).toHaveBeenCalledWith({
      to: "https://p-destination.wstd.dev/?authToken=token",
      assetsDir: "assets",
      ignoreVersionCheck: true,
      skipAssets: true,
    });
    expect(result.structuredContent.data).toEqual({ imported: true });
  });

  test("includes import in capability index when importer is provided", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      importProject: vi.fn(async () => ({ imported: true as const })),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const capabilities = (
      index.structuredContent.data as {
        capabilities: { tools: string[] }[];
      }
    ).capabilities;

    expect(capabilities.flatMap((capability) => capability.tools)).toContain(
      "import"
    );
  });

  test("rejects import without destination share link", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      importProject: vi.fn(),
    });

    await expect(
      adapter.callTool({ name: "import", input: {} })
    ).rejects.toThrow("import requires destination share link in to.");
  });

  test("delegates catalog operation tools without creating core session", async () => {
    const createProjectSession = createSessionFactory();
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "pages.list",
        result: [],
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
      })
    );
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession,
      executeOperation,
    });

    await adapter.callTool({ name: "list-pages" });
    await adapter.callTool({ name: "list-pages" });

    expect(createProjectSession).not.toHaveBeenCalled();
    expect(executeOperation).toHaveBeenCalledTimes(2);
  });

  test("calls project session management tools directly", async () => {
    const session = createSession({
      initialize: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.status",
          result: { loaded: true },
        })
      ),
      refresh: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.refresh",
          version: 2,
          source: "remote",
          result: { refreshedNamespaces: ["pages"] },
          namespaces: {
            read: ["pages"],
            write: [],
            invalidated: [],
            missing: [],
          },
        })
      ),
      reset: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.reset",
          buildId: undefined,
          version: undefined,
          result: { loaded: false },
        })
      ),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const status = await adapter.callTool({ name: "status" });
    const refresh = await adapter.callTool({
      name: "refresh",
      input: { namespaces: ["pages"] },
    });
    expect(session.initialize).toHaveBeenCalledTimes(2);
    const reset = await adapter.callTool({ name: "reset-session" });

    expect(status.structuredContent.data).toEqual({ loaded: true });
    expect(session.initialize).toHaveBeenCalledTimes(2);
    expect(session.refresh).toHaveBeenCalledWith(["pages"]);
    expect(refresh.structuredContent.meta.session).toEqual(
      expect.objectContaining({ operationId: "project-session.refresh" })
    );
    expect(reset.structuredContent.meta.session).toEqual(
      expect.objectContaining({ operationId: "project-session.reset" })
    );
  });

  test("calls meta tools without initializing project session", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "publish a site" },
    });
    const details = await adapter.callTool({
      name: "meta.get_more_tools",
      input: { brief: "build.publish" },
    });

    expect(session.initialize).not.toHaveBeenCalled();
    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({
        readThisFirst: expect.stringContaining("webstudio://project/guide"),
        startHere: expect.arrayContaining(["meta.guide"]),
        rules: expect.arrayContaining([
          expect.stringContaining(
            "Use direct value tools for fixed text/props"
          ),
        ]),
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            area: "publish",
            tools: ["publish"],
          }),
        ]),
      })
    );
    expect(index.structuredContent.data).not.toEqual(
      expect.objectContaining({
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            tools: expect.arrayContaining(["create-page"]),
          }),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "publish" }),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "publish",
            mcpExamples: [{ target: "production" }],
          }),
        ]),
      })
    );
    expect(details.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "publish",
            inputSchema: expect.any(Object),
            inputFields: ["target", "domains"],
            mcpExamples: [{ target: "production" }],
            cliExamples: [],
            inputNote: expect.stringContaining(
              "Use direct value tools for fixed text/props"
            ),
          }),
        ]),
      })
    );
  });

  test("exposes screenshot tools only when screenshot runners are injected", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const captureScreenshot = vi.fn(async () => ({
      output: "/tmp/current.png",
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: { width: 1440, height: 900 },
      elapsedMs: 12,
      warnings: [],
    }));
    const adapterWithoutScreenshot = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });
    const adapterWithScreenshot = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
      captureScreenshot,
    });
    const adapterWithScreenshotDiff = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
      diffScreenshots: diffPngFiles,
    });

    expect(
      adapterWithoutScreenshot.listTools().map((tool) => tool.name)
    ).not.toContain("screenshot");
    expect(
      adapterWithoutScreenshot.listTools().map((tool) => tool.name)
    ).not.toContain("screenshot.diff");
    expect(
      adapterWithScreenshot.listTools().map((tool) => tool.name)
    ).toContain("screenshot");
    expect(
      adapterWithScreenshot.listTools().map((tool) => tool.name)
    ).not.toContain("screenshot.diff");
    expect(
      adapterWithScreenshotDiff.listTools().map((tool) => tool.name)
    ).toContain("screenshot.diff");

    const result = await adapterWithScreenshot.callTool({
      name: "screenshot",
      input: {
        url: "https://example.com",
        output: "current.png",
        viewport: { width: 1440, height: 900 },
        browser: "auto",
        waitUntil: "networkidle",
        waitForSelector: "#ready",
        waitForTimeout: 500,
        timeout: 10_000,
      },
    });

    expect(session.initialize).not.toHaveBeenCalled();
    expect(captureScreenshot).toHaveBeenCalledWith({
      url: "https://example.com",
      path: undefined,
      output: "current.png",
      viewport: { width: 1440, height: 900 },
      browser: "auto",
      browserPath: undefined,
      waitUntil: "networkidle",
      waitForSelector: "#ready",
      waitForTimeout: 500,
      timeout: 10_000,
    });
    expect(result.structuredContent).toEqual({
      ok: true,
      data: {
        output: "/tmp/current.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium",
        viewport: { width: 1440, height: 900 },
        elapsedMs: 12,
        warnings: [],
      },
      meta: {},
    });
  });

  test("omits screenshot diff guidance when diff runner is not injected", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(async () => ({
        output: "/tmp/current.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: { width: 1440, height: 900 },
        elapsedMs: 12,
        warnings: [],
      })),
      startPreview: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      getPreviewStatus: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      guidance: testMcpGuidance,
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "visual verification" },
    });

    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({
        visionLoop: expect.not.arrayContaining([
          expect.stringContaining("screenshot.diff"),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          testMcpGuidance.getVisionWorkflowSummary({ includeDiff: false }),
        ]),
      })
    );
    expect(guide.content[0].text).not.toContain("screenshot.diff");
  });

  test("rejects unsupported screenshot browser input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          browser: "firefox",
        },
      })
    ).rejects.toThrow(
      "screenshot browser must be auto, chromium, chrome, edge, or brave."
    );
  });

  test("rejects invalid screenshot readiness input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitUntil: "interactive",
        },
      })
    ).rejects.toThrow(
      "screenshot waitUntil must be commit, domcontentloaded, load, or networkidle."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForTimeout: -1,
        },
      })
    ).rejects.toThrow(
      "screenshot waitForTimeout must be a non-negative integer."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForTimeout: "500",
        },
      })
    ).rejects.toThrow(
      "screenshot waitForTimeout must be a non-negative integer."
    );

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForSelector: "",
        },
      })
    ).rejects.toThrow("screenshot waitForSelector must be a non-empty string.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          waitForSelector: 1,
        },
      })
    ).rejects.toThrow("screenshot waitForSelector must be a non-empty string.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          timeout: 0,
        },
      })
    ).rejects.toThrow("screenshot timeout must be a positive integer.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "https://example.com",
          timeout: "10000",
        },
      })
    ).rejects.toThrow("screenshot timeout must be a positive integer.");
  });

  test("rejects empty screenshot url and path input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          url: "",
        },
      })
    ).rejects.toThrow("screenshot requires url or path.");

    await expect(
      adapter.callTool({
        name: "screenshot",
        input: {
          path: "",
        },
      })
    ).rejects.toThrow("screenshot requires url or path.");
  });

  test("compares screenshot diffs with generated PNG files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-diff-"));
    try {
      const baselinePath = path.join(tempDir, "baseline.png");
      const currentPath = path.join(tempDir, "current.png");
      const outputDir = path.join(tempDir, "diff");
      await writePng(baselinePath, createPng(4, 4, { r: 255, g: 255, b: 255 }));
      const current = createPng(4, 4, { r: 255, g: 255, b: 255 });
      paintRect(
        current,
        { x: 1, y: 1, width: 2, height: 1 },
        { r: 0, g: 0, b: 0 }
      );
      await writePng(currentPath, current);
      const adapter = createProjectSessionMcpCore({
        operations: publicMcpOperations,
        createProjectSession: createSessionFactory(),
        executeOperation: createExecuteOperation(),
        diffScreenshots: diffPngFiles,
      });

      const result = await adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath,
          currentPath,
          outputDir,
        },
      });

      expect(result.structuredContent.data).toEqual(
        expect.objectContaining({
          totalPixels: 16,
          differentPixels: 2,
          mismatchPercentage: 12.5,
          regions: [
            expect.objectContaining({
              bounds: { x: 1, y: 1, width: 2, height: 1 },
              pixelCount: 2,
            }),
          ],
          summary: expect.stringContaining("status: changed"),
          diffPath: path.join(outputDir, "current-diff.png"),
          contextDiffPath: path.join(outputDir, "current-context-diff.png"),
        })
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("rejects invalid screenshot diff input", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      diffScreenshots: diffPngFiles,
    });

    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: { baselinePath: "baseline.png" },
      })
    ).rejects.toThrow("screenshot.diff requires baselinePath and currentPath.");
    await expect(
      adapter.callTool({
        name: "screenshot.diff",
        input: {
          baselinePath: "baseline.png",
          currentPath: "current.png",
          threshold: 2,
        },
      })
    ).rejects.toThrow("screenshot.diff threshold must be between 0 and 1.");
  });

  test("installs OCR only after explicit confirmation", async () => {
    const installOcr = vi.fn(async () => ({
      installed: true,
      alreadyAvailable: false,
      command: "sudo apt install -y tesseract-ocr",
      tesseractPath: "/usr/bin/tesseract",
      installUrl: tesseractInstallUrl,
      warnings: [],
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      installOcr,
    });

    await expect(
      adapter.callTool({ name: "vision.install-ocr", input: {} })
    ).rejects.toThrow(
      "vision.install-ocr requires confirm: true after explicit user consent."
    );
    await expect(
      adapter.callTool({
        name: "vision.install-ocr",
        input: { confirm: true },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        structuredContent: expect.objectContaining({
          data: expect.objectContaining({
            installed: true,
            tesseractPath: "/usr/bin/tesseract",
          }),
        }),
      })
    );
    expect(installOcr).toHaveBeenCalledOnce();
  });

  test("exposes preview tools when preview runner is injected", async () => {
    const captureScreenshot = vi.fn(async () => ({
      output: "/tmp/current.png",
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: { width: 1440, height: 900 },
      elapsedMs: 12,
      warnings: [],
    }));
    const startPreview = vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    }));
    const getPreviewStatus = vi.fn(async () => ({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    }));
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot,
      diffScreenshots: diffPngFiles,
      startPreview,
      getPreviewStatus,
      guidance: testMcpGuidance,
    });

    expect(adapter.listTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["preview.start", "preview.status"])
    );

    const started = await adapter.callTool({
      name: "preview.start",
      input: { host: "127.0.0.1", port: 5173 },
    });
    const status = await adapter.callTool({ name: "preview.status" });
    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "visual verification" },
    });

    expect(startPreview).toHaveBeenCalledWith({
      host: "127.0.0.1",
      port: 5173,
    });
    expect(getPreviewStatus).toHaveBeenCalledOnce();
    expect(started.structuredContent.data).toEqual({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    });
    expect(status.structuredContent.data).toEqual({
      url: "http://127.0.0.1:5173/",
      pid: 123,
      running: true,
    });
    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({
        visionLoop: expect.arrayContaining([
          ...testMcpGuidance
            .getVisionVerificationLoop({ includeDiff: true })
            .slice(1, 3),
          'Call screenshot with { path: "/" } or the changed page path.',
        ]),
        capabilities: expect.arrayContaining([
          expect.objectContaining({
            area: "visual-verification",
            tools: [
              "preview.start",
              "preview.status",
              "screenshot",
              "screenshot.diff",
            ],
          }),
        ]),
      })
    );
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        workflow: expect.arrayContaining([
          testMcpGuidance.getVisionWorkflowSummary({ includeDiff: true }),
        ]),
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "preview.start" }),
          expect.objectContaining({ name: "screenshot" }),
        ]),
      })
    );
  });

  test("does not include visual guidance without host-provided docs", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      captureScreenshot: vi.fn(),
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
    });

    const index = await adapter.callTool({ name: "meta.index" });
    const guide = await adapter.callTool({
      name: "meta.guide",
      input: { brief: "visual verification" },
    });

    expect(index.structuredContent.data).toEqual(
      expect.objectContaining({ visionLoop: [] })
    );
    expect(
      (guide.structuredContent.data as { workflow: string[] }).workflow
    ).not.toContain(
      testMcpGuidance.getVisionWorkflowSummary({ includeDiff: false })
    );
  });

  test("rejects invalid preview ports", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "preview.start",
        input: { port: 70000 },
      })
    ).rejects.toThrow("preview port must be an integer between 1 and 65535.");
  });

  test("rejects empty preview host", async () => {
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      startPreview: vi.fn(),
      getPreviewStatus: vi.fn(),
    });

    await expect(
      adapter.callTool({
        name: "preview.start",
        input: { host: "" },
      })
    ).rejects.toThrow("preview host must not be empty.");
  });

  test("uses discovery tools when meta guide has no brief", async () => {
    const session = createSession({
      initialize: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const guide = await adapter.callTool({ name: "meta.guide" });

    expect(session.initialize).not.toHaveBeenCalled();
    expect(guide.structuredContent.data).toEqual(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "status" }),
          expect.objectContaining({ name: "whoami" }),
        ]),
      })
    );
  });

  test("rejects unknown tools before calling the operation executor", async () => {
    const createProjectSession = createSessionFactory();
    const executeOperation = createExecuteOperation();
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession,
      executeOperation,
    });

    await expect(adapter.callTool({ name: "unknown-tool" })).rejects.toThrow(
      'Unknown MCP tool "unknown-tool".'
    );
    expect(createProjectSession).not.toHaveBeenCalled();
    expect(executeOperation).not.toHaveBeenCalled();
  });

  test("reads MCP resources from the long-lived project session", async () => {
    const session = createSession({
      initialize: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.status",
          result: { loaded: true },
        })
      ),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const adapter = createProjectSessionMcpCore({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation: createExecuteOperation(),
    });

    const status = await adapter.readResource({
      uri: "webstudio://project/status",
    });
    const tools = await adapter.readResource({
      uri: "webstudio://project/tools",
    });
    const guide = await adapter.readResource({
      uri: "webstudio://project/guide",
    });

    expect(JSON.parse(status.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        data: { loaded: true },
        meta: expect.objectContaining({
          session: expect.objectContaining({
            operationId: "project-session.status",
          }),
        }),
      })
    );
    expect(JSON.parse(tools.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({ tools: expect.any(Array) })
    );
    expect(JSON.parse(guide.contents[0]?.text ?? "{}")).toEqual(
      expect.objectContaining({
        readThisFirst: expect.stringContaining("webstudio://project/guide"),
        startHere: expect.arrayContaining(["meta.index"]),
        rules: expect.arrayContaining([
          expect.stringContaining(
            "Use direct value tools for fixed text/props"
          ),
        ]),
      })
    );
  });

  test("connects through the official MCP SDK and exposes discovery", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      expect(client.getServerCapabilities()).toEqual({
        tools: {},
        resources: {},
      });
      expect(client.getServerVersion()).toEqual({
        name: "webstudio",
        version: "0.0.0",
      });
      await expect(client.listTools()).resolves.toEqual({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "list-pages",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
            }),
            _meta: {
              webstudio: expect.objectContaining({
                operationId: "pages.list",
              }),
            },
          }),
          expect.objectContaining({
            name: "publish",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: true,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "meta.index",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
            }),
          }),
          expect.objectContaining({
            name: "refresh",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
            }),
          }),
          expect.objectContaining({
            name: "reset-session",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: true,
            }),
          }),
        ]),
      });
      await expect(client.listResources()).resolves.toEqual({
        resources: expect.arrayContaining([
          expect.objectContaining({ uri: "webstudio://project/status" }),
          expect.objectContaining({ uri: "webstudio://project/tools" }),
        ]),
      });
    } finally {
      await close();
    }
  });

  test("marks visual verification tools with side-effect-aware SDK annotations", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(),
      startPreview: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      getPreviewStatus: vi.fn(async () => ({
        url: "http://127.0.0.1:5173/",
        running: true,
      })),
      captureScreenshot: vi.fn(async () => ({
        output: "current.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: { width: 1440, height: 900 },
        elapsedMs: 1,
        warnings: [],
      })),
      diffScreenshots: vi.fn(async () => ({
        totalPixels: 0,
        differentPixels: 0,
        mismatchPercentage: 0,
        summary: "Screenshot diff summary",
        regions: [],
        textAnalysis: {
          status: "skipped" as const,
          provider: "tesseract" as const,
          changes: [],
        },
        warnings: [],
      })),
      installOcr: vi.fn(async () => ({
        installed: false,
        alreadyAvailable: true,
        tesseractPath: "/usr/bin/tesseract",
        installUrl: tesseractInstallUrl,
        warnings: [],
      })),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(client.listTools()).resolves.toEqual({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: "preview.start",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "preview.status",
            annotations: expect.objectContaining({
              readOnlyHint: true,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "screenshot",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "screenshot.diff",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
          expect.objectContaining({
            name: "vision.install-ocr",
            annotations: expect.objectContaining({
              readOnlyHint: false,
              destructiveHint: false,
              openWorldHint: true,
            }),
          }),
        ]),
      });
    } finally {
      await close();
    }
  });

  test("handles SDK tool calls and resource reads", async () => {
    const session = createSession({
      initialize: vi.fn(async () =>
        createEnvelope({
          operationId: "project-session.status",
          result: { loaded: true },
        })
      ),
      refresh: vi.fn(),
      reset: vi.fn(),
    });
    const executeOperation: ExecuteOperation = vi.fn(async () =>
      createEnvelope({
        operationId: "pages.list",
        result: [{ id: "home" }],
      })
    );
    const importProject = vi.fn(async () => ({ imported: true as const }));
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation,
      importProject,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(
        client.callTool({
          name: "list-pages",
          arguments: { includeFolders: true, dryRun: true },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            ok: true,
            data: [{ id: "home" }],
          }),
        })
      );
      expect(executeOperation).toHaveBeenCalledWith({
        command: "list-pages",
        input: { includeFolders: true },
        dryRun: true,
      });
      await client.callTool({
        name: "list-pages",
        arguments: { includeFolders: true, dryRun: false },
      });
      expect(executeOperation).toHaveBeenLastCalledWith({
        command: "list-pages",
        input: { includeFolders: true },
        dryRun: false,
      });
      await expect(
        client.callTool({
          name: "import",
          arguments: {
            to: "https://p-destination.wstd.dev/?authToken=token",
          },
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            data: { imported: true },
          }),
        })
      );
      expect(importProject).toHaveBeenCalledWith({
        to: "https://p-destination.wstd.dev/?authToken=token",
        assetsDir: undefined,
        ignoreVersionCheck: false,
        skipAssets: false,
      });

      await expect(
        client.readResource({ uri: "webstudio://project/status" })
      ).resolves.toEqual({
        contents: [
          expect.objectContaining({
            uri: "webstudio://project/status",
            mimeType: "application/json",
          }),
        ],
      });
    } finally {
      await close();
    }
  });

  test("returns stable SDK tool errors from resolver", async () => {
    const error = new Error(
      "Project session snapshot changed on disk."
    ) as Error & { code: string };
    error.code = "PROJECT_SESSION_BUSY";
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () => {
        throw error;
      }),
      getErrorCode: (error) =>
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined,
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(
        client.callTool({
          name: "list-pages",
          arguments: {},
        })
      ).resolves.toEqual(
        expect.objectContaining({
          isError: true,
          structuredContent: {
            ok: false,
            error: {
              message: "Project session snapshot changed on disk.",
              code: "PROJECT_SESSION_BUSY",
            },
            meta: {},
          },
        })
      );
    } finally {
      await close();
    }
  });

  test("creates a complete project session MCP server", async () => {
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(),
      executeOperation: createExecuteOperation(async () =>
        createEnvelope({
          operationId: "pages.list",
          result: [{ id: "home" }],
        })
      ),
    });
    const { client, close } = await createConnectedClient(server);

    try {
      await expect(
        client.callTool({
          name: "list-pages",
          arguments: {},
        })
      ).resolves.toEqual(
        expect.objectContaining({
          structuredContent: expect.objectContaining({
            data: [{ id: "home" }],
          }),
        })
      );
    } finally {
      await close();
    }
  });
});
