import { describe, expect, test, vi } from "vitest";
import {
  createMcpMessageParser,
  encodeMcpMessage,
  handleMcpRequest,
} from "./mcp";
import type { ProjectSessionMcpCallResult } from "../project-session-mcp";

type TestMcpAdapter = Parameters<typeof handleMcpRequest>[0];

const toolInputSchema = {
  type: "object" as const,
  additionalProperties: true as const,
  properties: {
    "page-id": { description: "Page id" },
  },
  required: ["page-id"],
};

const createTool = () =>
  ({
    name: "list-pages",
    description: "List pages",
    inputSchema: toolInputSchema,
    annotations: {
      command: "list-pages",
      operationId: "pages.list",
      method: "query",
      permit: "view",
      localCapable: true,
      serverOnly: false,
      readNamespaces: ["pages"],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }) as const;

const createAdapter = () => {
  const callTool = vi.fn(
    async (): Promise<ProjectSessionMcpCallResult> => ({
      content: [{ type: "text" as const, text: '{"ok":true}' }] as [
        { type: "text"; text: string },
      ],
      structuredContent: {
        ok: true as const,
        data: [{ id: "home" }],
        meta: {
          session: {
            operationId: "pages.list",
            projectId: "project-1",
            buildId: "build-1",
            version: 1,
            source: "local",
            committed: false,
            compatibility: undefined,
            namespaces: {
              read: ["pages"],
              write: [],
              invalidated: [],
              missing: [],
            },
            diagnostics: [],
          },
        },
      },
    })
  );
  const adapter: TestMcpAdapter = {
    listTools: vi.fn(() => [createTool()]),
    listResources: vi.fn(() => [
      {
        uri: "webstudio://project/status",
        name: "ProjectSession status",
        description: "Status",
        mimeType: "application/json" as const,
      },
    ]),
    readResource: vi.fn(async ({ uri }) => ({
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ ok: true }),
        },
      ],
    })),
    callTool,
  };
  return { ...adapter, callTool };
};

describe("mcp command protocol helpers", () => {
  test("initializes with tool capability", async () => {
    const response = await handleMcpRequest(createAdapter(), {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: expect.objectContaining({
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "webstudio", version: "0.0.0" },
      }),
    });
  });

  test("lists tools from the project session adapter", async () => {
    const response = await handleMcpRequest(createAdapter(), {
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: "tools",
      result: {
        tools: [
          expect.objectContaining({
            name: "list-pages",
            inputSchema: toolInputSchema,
            annotations: expect.objectContaining({
              operationId: "pages.list",
              localCapable: true,
            }),
          }),
        ],
      },
    });
  });

  test("calls tools through the project session adapter", async () => {
    const adapter = createAdapter();
    const response = await handleMcpRequest(adapter, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "list-pages",
        arguments: { includeFolders: true },
        dryRun: true,
      },
    });

    expect(adapter.callTool).toHaveBeenCalledWith({
      name: "list-pages",
      input: { includeFolders: true },
      dryRun: true,
    });
    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: expect.objectContaining({
        structuredContent: expect.objectContaining({
          ok: true,
          data: [{ id: "home" }],
        }),
      }),
    });
  });

  test("lists and reads resources through the project session adapter", async () => {
    const adapter = createAdapter();

    await expect(
      handleMcpRequest(adapter, {
        jsonrpc: "2.0",
        id: "resources",
        method: "resources/list",
      })
    ).resolves.toEqual({
      jsonrpc: "2.0",
      id: "resources",
      result: {
        resources: [
          expect.objectContaining({ uri: "webstudio://project/status" }),
        ],
      },
    });

    await expect(
      handleMcpRequest(adapter, {
        jsonrpc: "2.0",
        id: "resource",
        method: "resources/read",
        params: { uri: "webstudio://project/status" },
      })
    ).resolves.toEqual({
      jsonrpc: "2.0",
      id: "resource",
      result: {
        contents: [
          {
            uri: "webstudio://project/status",
            mimeType: "application/json",
            text: JSON.stringify({ ok: true }),
          },
        ],
      },
    });
  });

  test("returns stable tool error codes in JSON-RPC error data", async () => {
    const error = new Error(
      "Project session snapshot changed on disk."
    ) as Error & { code: string };
    error.code = "PROJECT_SESSION_BUSY";
    const adapter = {
      listTools: vi.fn(() => []),
      listResources: vi.fn(() => []),
      readResource: vi.fn(),
      callTool: vi.fn(async () => {
        throw error;
      }),
    };

    await expect(
      handleMcpRequest(adapter, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "list-pages" },
      })
    ).resolves.toEqual({
      jsonrpc: "2.0",
      id: 3,
      error: {
        code: -32603,
        message: "Project session snapshot changed on disk.",
        data: { code: "PROJECT_SESSION_BUSY" },
      },
    });
  });

  test("ignores unknown notifications", async () => {
    await expect(
      handleMcpRequest(createAdapter(), {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      })
    ).resolves.toBeUndefined();
  });

  test("encodes and parses content-length framed messages", () => {
    const messages: unknown[] = [];
    const parse = createMcpMessageParser((message) => messages.push(message));
    const encoded = encodeMcpMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const midpoint = Math.floor(encoded.length / 2);

    parse(encoded.slice(0, midpoint));
    expect(messages).toEqual([]);
    parse(encoded.slice(midpoint));

    expect(messages).toEqual([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      },
    ]);
  });
});
