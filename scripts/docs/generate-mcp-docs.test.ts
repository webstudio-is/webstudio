import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpDocumentation } from "./generate-mcp-docs.js";

test("rejects an unexpected CLI manual", () => {
  assert.throws(() => renderMcpDocumentation("# Different manual", "1.2.3"));
});

test("rejects a missing CLI version", () => {
  assert.throws(() =>
    renderMcpDocumentation("# Webstudio MCP Manual\n\nBody", "")
  );
});
