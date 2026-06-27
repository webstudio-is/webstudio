import { describe, expect, test, vi } from "vitest";
import { publicApiOperations } from "@webstudio-is/http-client";
import {
  createProjectSessionMcpAdapter,
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
} from "./project-session-mcp";

type CreateProjectSession = NonNullable<
  Parameters<typeof createProjectSessionMcpAdapter>[0]["createProjectSession"]
>;

describe("project session mcp adapter", () => {
  test("lists tools from the public operation catalog", () => {
    const tools = listProjectSessionMcpTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      ...publicApiOperations.map((operation) => operation.command),
      "status",
      "refresh",
      "reset-session",
    ]);
    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "list-pages",
          annotations: expect.objectContaining({
            operationId: "pages.list",
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

  test("derives required tool inputs from the public operation catalog", () => {
    const toolsByName = new Map(
      listProjectSessionMcpTools().map((tool) => [tool.name, tool])
    );

    for (const operation of publicApiOperations) {
      const required =
        operation.requiredOptions?.filter((option) => option !== "json") ?? [];
      const tool = toolsByName.get(operation.command);

      expect(tool?.inputSchema.required ?? []).toEqual(required);
      expect(Object.keys(tool?.inputSchema.properties ?? {})).toEqual(required);
    }
  });

  test("lists MCP resources for project status and tool catalog", () => {
    expect(listProjectSessionMcpResources()).toEqual([
      expect.objectContaining({ uri: "webstudio://project/status" }),
      expect.objectContaining({ uri: "webstudio://project/tools" }),
    ]);
  });

  test("calls tools through project session operation executor", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "pages.list",
        projectId: "project-1",
        buildId: "build-1",
        version: 1,
        source: "local",
        result: [{ id: "home" }],
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(),
    };
    const adapter = createProjectSessionMcpAdapter({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession: vi.fn(
        () => session
      ) as unknown as CreateProjectSession,
    });

    const result = await adapter.callTool({
      name: "list-pages",
      input: { includeFolders: true },
    });

    expect(session.read).toHaveBeenCalledWith(
      "pages.list",
      { includeFolders: true },
      { permit: "view" }
    );
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

  test("reuses one project session across tool calls", async () => {
    const session = {
      initialize: vi.fn(async () => undefined),
      read: vi.fn(async () => ({
        operationId: "pages.list",
        projectId: "project-1",
        buildId: "build-1",
        version: 1,
        source: "local",
        result: [],
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(),
    };
    const createProjectSession = vi.fn(
      () => session
    ) as unknown as CreateProjectSession;
    const adapter = createProjectSessionMcpAdapter({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession,
    });

    await adapter.callTool({ name: "list-pages" });
    await adapter.callTool({ name: "list-pages" });

    expect(createProjectSession).toHaveBeenCalledTimes(1);
    expect(session.read).toHaveBeenCalledTimes(2);
  });

  test("calls project session management tools directly", async () => {
    const session = {
      initialize: vi.fn(async () => ({
        operationId: "project-session.status",
        projectId: "project-1",
        buildId: "build-1",
        version: 1,
        source: "local",
        result: { loaded: true },
        state: { committed: false, freshness: {} },
        namespaces: { read: [], write: [], invalidated: [], missing: [] },
        diagnostics: [],
      })),
      refresh: vi.fn(async () => ({
        operationId: "project-session.refresh",
        projectId: "project-1",
        buildId: "build-1",
        version: 2,
        source: "remote",
        result: { refreshedNamespaces: ["pages"] },
        state: { committed: false, freshness: {} },
        namespaces: {
          read: ["pages"],
          write: [],
          invalidated: [],
          missing: [],
        },
        diagnostics: [],
      })),
      reset: vi.fn(async () => ({
        operationId: "project-session.reset",
        projectId: "project-1",
        buildId: undefined,
        version: undefined,
        source: "local",
        result: { loaded: false },
        state: { committed: false, freshness: {} },
        namespaces: { read: [], write: [], invalidated: [], missing: [] },
        diagnostics: [],
      })),
      read: vi.fn(),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(),
    };
    const adapter = createProjectSessionMcpAdapter({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession: vi.fn(
        () => session
      ) as unknown as CreateProjectSession,
    });

    const status = await adapter.callTool({ name: "status" });
    const refresh = await adapter.callTool({
      name: "refresh",
      input: { namespaces: ["pages"] },
    });
    const reset = await adapter.callTool({ name: "reset-session" });

    expect(status.structuredContent.data).toEqual({ loaded: true });
    expect(session.refresh).toHaveBeenCalledWith(["pages"]);
    expect(refresh.structuredContent.meta.session).toEqual(
      expect.objectContaining({ operationId: "project-session.refresh" })
    );
    expect(reset.structuredContent.meta.session).toEqual(
      expect.objectContaining({ operationId: "project-session.reset" })
    );
  });

  test("reads MCP resources from the long-lived project session", async () => {
    const session = {
      initialize: vi.fn(async () => ({
        operationId: "project-session.status",
        projectId: "project-1",
        buildId: "build-1",
        version: 1,
        source: "local",
        result: { loaded: true },
        state: { committed: false, freshness: {} },
        namespaces: { read: [], write: [], invalidated: [], missing: [] },
        diagnostics: [],
      })),
      read: vi.fn(),
      mutate: vi.fn(),
      executeServerOperation: vi.fn(),
    };
    const adapter = createProjectSessionMcpAdapter({
      connection: {
        projectId: "project-1",
        origin: "https://example.com",
        authToken: "token",
      },
      createProjectSession: vi.fn(
        () => session
      ) as unknown as CreateProjectSession,
    });

    const status = await adapter.readResource({
      uri: "webstudio://project/status",
    });
    const tools = await adapter.readResource({
      uri: "webstudio://project/tools",
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
  });
});
