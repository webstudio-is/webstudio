import { expect, test, vi } from "vitest";
import { mcpOptions } from "./mcp";

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
});
