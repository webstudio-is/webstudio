import { stdin, stdout } from "node:process";
import { createProjectSessionMcpAdapter } from "../project-session-mcp";
import { resolveApiConnection } from "../api-connection";
import { getStableErrorCode } from "../error-codes";
import { apiCompatibilityHeaders } from "./api";
import type { CommonYargsArgv } from "./yargs-types";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type ProjectSessionMcpAdapter = ReturnType<
  typeof createProjectSessionMcpAdapter
>;

type McpAdapter = {
  listTools: ProjectSessionMcpAdapter["listTools"];
  listResources: ProjectSessionMcpAdapter["listResources"];
  readResource: ProjectSessionMcpAdapter["readResource"];
  callTool: (options: {
    name: string;
    input?: unknown;
    dryRun?: boolean;
  }) => ReturnType<ProjectSessionMcpAdapter["callTool"]>;
};

const protocolVersion = "2024-11-05";

export const mcpOptions = (yargs: CommonYargsArgv) =>
  yargs.example(
    "$0 mcp",
    "Run a local MCP server over stdio for the configured Webstudio project"
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const createJsonRpcResult = (id: JsonRpcId | undefined, result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

const createJsonRpcError = (
  id: JsonRpcId | undefined,
  code: number,
  message: string,
  data?: unknown
) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: data === undefined ? { code, message } : { code, message, data },
});

export const handleMcpRequest = async (
  adapter: McpAdapter,
  request: JsonRpcRequest
) => {
  const { id, method } = request;
  if (method === undefined) {
    return createJsonRpcError(id, -32600, "Missing MCP method.");
  }

  if (method === "initialize") {
    return createJsonRpcResult(id, {
      protocolVersion,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: "webstudio", version: "0.0.0" },
    });
  }

  if (method === "tools/list") {
    return createJsonRpcResult(id, {
      tools: adapter.listTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object",
          additionalProperties: true,
        },
        annotations: tool.annotations,
      })),
    });
  }

  if (method === "resources/list") {
    return createJsonRpcResult(id, {
      resources: adapter.listResources(),
    });
  }

  if (method === "resources/read") {
    const params = isRecord(request.params) ? request.params : {};
    const uri = typeof params.uri === "string" ? params.uri : undefined;
    if (uri === undefined) {
      return createJsonRpcError(
        id,
        -32602,
        "resources/read requires params.uri."
      );
    }
    try {
      return createJsonRpcResult(id, await adapter.readResource({ uri }));
    } catch (error) {
      return createJsonRpcError(
        id,
        -32603,
        error instanceof Error ? error.message : String(error),
        { code: getStableErrorCode(error) ?? "MCP_RESOURCE_FAILED" }
      );
    }
  }

  if (method === "tools/call") {
    const params = isRecord(request.params) ? request.params : {};
    const name = typeof params.name === "string" ? params.name : undefined;
    if (name === undefined) {
      return createJsonRpcError(id, -32602, "tools/call requires params.name.");
    }
    try {
      const result = await adapter.callTool({
        name,
        input: params.arguments ?? {},
        dryRun: params.dryRun === true,
      });
      return createJsonRpcResult(id, result);
    } catch (error) {
      return createJsonRpcError(
        id,
        -32603,
        error instanceof Error ? error.message : String(error),
        { code: getStableErrorCode(error) ?? "MCP_TOOL_FAILED" }
      );
    }
  }

  if (id === undefined) {
    return;
  }

  return createJsonRpcError(id, -32601, `Unknown MCP method "${method}".`);
};

export const encodeMcpMessage = (message: unknown) => {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, "utf-8")}\r\n\r\n${body}`;
};

const parseContentLength = (headers: string) => {
  for (const line of headers.split("\r\n")) {
    const [name, value] = line.split(":");
    if (name?.toLowerCase() === "content-length") {
      const length = Number(value?.trim());
      if (Number.isInteger(length) && length >= 0) {
        return length;
      }
    }
  }
};

export const createMcpMessageParser = (
  onMessage: (message: JsonRpcRequest) => void
) => {
  let buffer = Buffer.alloc(0);
  return (chunk: Buffer | string) => {
    buffer = Buffer.concat([
      buffer,
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
    ]);
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }
      const headers = buffer.subarray(0, headerEnd).toString("utf-8");
      const contentLength = parseContentLength(headers);
      if (contentLength === undefined) {
        throw new Error("MCP message is missing Content-Length.");
      }
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (buffer.length < bodyEnd) {
        return;
      }
      const body = buffer.subarray(bodyStart, bodyEnd).toString("utf-8");
      buffer = buffer.subarray(bodyEnd);
      onMessage(JSON.parse(body));
    }
  };
};

export const mcp = async () => {
  const connection = await resolveApiConnection();
  const adapter = createProjectSessionMcpAdapter({
    connection: {
      ...connection,
      headers: apiCompatibilityHeaders,
    },
  });

  const pending = new Set<Promise<void>>();
  const parse = createMcpMessageParser((request) => {
    if (
      request.id === undefined &&
      request.method?.startsWith("notifications/")
    ) {
      return;
    }
    const task = handleMcpRequest(adapter, request)
      .then((response) => {
        if (response !== undefined) {
          stdout.write(encodeMcpMessage(response));
        }
      })
      .catch((error) => {
        stdout.write(
          encodeMcpMessage(
            createJsonRpcError(
              request.id,
              -32603,
              error instanceof Error ? error.message : String(error),
              { code: getStableErrorCode(error) ?? "MCP_TOOL_FAILED" }
            )
          )
        );
      })
      .finally(() => {
        pending.delete(task);
      });
    pending.add(task);
  });

  for await (const chunk of stdin) {
    parse(chunk);
  }
  await Promise.all(pending);
};
