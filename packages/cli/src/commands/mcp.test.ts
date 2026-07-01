import { expect, test, vi } from "vitest";
import { builderNamespaces } from "@webstudio-is/project-build/contracts/namespaces";
import { mcpOptions, prepareMcpProjectSession } from "./mcp";

test("documents MCP stdio startup and discovery tools", () => {
  const yargs = {
    example: vi.fn(() => yargs),
    epilogue: vi.fn(() => yargs),
  };

  mcpOptions(yargs as never);

  expect(yargs.example).toHaveBeenCalledWith(
    "$0 mcp",
    "Run a local MCP server over stdio for the configured Webstudio project"
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
    expect.stringContaining("webstudio://project/guide")
  );
});

test("marks cached namespaces stale before serving MCP tools", async () => {
  const session = {
    initialize: vi.fn(async () => undefined),
    markStale: vi.fn(async () => undefined),
  };

  await prepareMcpProjectSession(session);

  expect(session.initialize).toHaveBeenCalled();
  expect(session.markStale).toHaveBeenCalledWith(builderNamespaces);
});
