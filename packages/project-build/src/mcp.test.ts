import { describe, expect, test, vi } from "vitest";
import {
  createProjectSessionMcpCore,
  createProjectSessionMcpServer,
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
  type PublicMcpOperation,
} from "./mcp";
import type { ProjectSessionEnvelope } from "./project-session";

type CreateProjectSession = NonNullable<
  Parameters<typeof createProjectSessionMcpCore>[0]["createProjectSession"]
>;

type ExecuteOperation = NonNullable<
  Parameters<typeof createProjectSessionMcpCore>[0]["executeOperation"]
>;

type TestSession = ReturnType<CreateProjectSession>;

const publicMcpOperations: readonly PublicMcpOperation[] = [
  {
    command: "list-pages",
    id: "pages.list",
    method: "query",
    permit: "view",
    description: "List pages",
    inputFields: ["includeFolders"],
    localCapable: true,
    serverOnly: false,
    readNamespaces: ["pages"],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
  {
    command: "whoami",
    id: "auth.me",
    method: "query",
    permit: "view",
    description: "Identify token",
    inputFields: [],
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
  {
    command: "publish",
    id: "build.publish",
    method: "mutation",
    permit: "build",
    description: "Publish project",
    inputFields: ["target", "domains"],
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
];

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

const importModule = (specifier: string) =>
  import(/* @vite-ignore */ specifier) as Promise<Record<string, unknown>>;

const createConnectedClient = async (
  server: Awaited<ReturnType<typeof createProjectSessionMcpServer>>
) => {
  const [{ Client }, { InMemoryTransport }] = await Promise.all([
    importModule("@modelcontextprotocol/sdk/client/index.js"),
    importModule("@modelcontextprotocol/sdk/inMemory.js"),
  ]);
  const [clientTransport, serverTransport] = (
    InMemoryTransport as {
      createLinkedPair: () => [
        {
          start: () => Promise<void>;
          close: () => Promise<void>;
          send: (message: unknown) => Promise<void>;
        },
        {
          start: () => Promise<void>;
          close: () => Promise<void>;
          send: (message: unknown) => Promise<void>;
        },
      ];
    }
  ).createLinkedPair();
  const client = new (Client as new (info: {
    name: string;
    version: string;
  }) => {
    close: () => Promise<void>;
    connect: (transport: typeof clientTransport) => Promise<void>;
    callTool: (params: {
      name: string;
      arguments?: Record<string, unknown>;
    }) => Promise<unknown>;
    getServerCapabilities: () => unknown;
    getServerVersion: () => unknown;
    listResources: () => Promise<unknown>;
    listTools: () => Promise<unknown>;
    readResource: (params: { uri: string }) => Promise<unknown>;
  })({ name: "test-client", version: "1.0.0" });
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
        startHere: expect.arrayContaining(["meta.guide"]),
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
            inputNote:
              "MCP tool arguments are public API input objects. CLI examples show intent, but do not imply MCP flag names.",
          }),
        ]),
      })
    );
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
        startHere: expect.arrayContaining(["meta.index"]),
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
          expect.objectContaining({ name: "meta.index" }),
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
    const server = await createProjectSessionMcpServer({
      operations: publicMcpOperations,
      createProjectSession: createSessionFactory(session),
      executeOperation,
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
