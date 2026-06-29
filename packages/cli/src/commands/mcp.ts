import { stdin, stdout } from "node:process";
import {
  connectProjectSessionMcpServer,
  createMcpStdioTransport,
} from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/http-client";
import { resolveApiConnection } from "../api-connection";
import { getStableErrorCode } from "../error-codes";
import { createCliProjectSession } from "../project-session";
import { executeProjectSessionApiOperation } from "../project-session-api";
import { apiCompatibilityHeaders } from "./api";
import type { CommonYargsArgv } from "./yargs-types";

export const mcpOptions = (yargs: CommonYargsArgv) =>
  yargs
    .example(
      "$0 mcp",
      "Run a local MCP server over stdio for the configured Webstudio project"
    )
    .example(
      "MCP tool: meta.index",
      "Discover the concise capability catalog after the server starts"
    )
    .example(
      "MCP tool: meta.guide",
      "Ask for the recommended workflow and relevant tools"
    )
    .epilogue(
      [
        "Plain `webstudio mcp` starts the stdio MCP server.",
        "After startup, MCP clients discover capabilities with tools/list, resources/list, meta.index, meta.guide, and meta.get_more_tools.",
        "stdout is reserved for MCP JSON-RPC messages while the server is running.",
      ].join("\n")
    );

export const mcp = async () => {
  const connection = await resolveApiConnection();
  const apiConnection = {
    ...connection,
    headers: apiCompatibilityHeaders,
  };
  const session = createCliProjectSession({ connection: apiConnection });
  await connectProjectSessionMcpServer({
    operations: publicApiOperations,
    createProjectSession: () => session,
    executeOperation: ({ command, input, dryRun }) =>
      executeProjectSessionApiOperation({
        command,
        input,
        connection: apiConnection,
        createProjectSession: () => session,
        dryRun,
      }),
    getErrorCode: getStableErrorCode,
    transport: await createMcpStdioTransport({ stdin, stdout }),
  });
};
