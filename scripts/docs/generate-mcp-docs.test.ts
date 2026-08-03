import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpDocumentation } from "./generate-mcp-docs.js";

test("renders GitBook metadata around the complete CLI manual", () => {
  const generated = renderMcpDocumentation(
    "# Webstudio MCP Manual\n\n## Startup\n\nStart here.\n"
  );

  assert.match(generated, /^---\n/);
  assert.match(generated, /# Webstudio MCP\n/);
  assert.match(
    generated,
    /GitBook publishes it when that revision is successfully released/
  );
  assert.match(
    generated,
    /See \[CLI\]\(cli\.md\) for Node\.js and\s+`npx` setup/
  );
  assert.match(generated, /## Startup\n\nStart here\./);
  assert.match(generated, /## Related\n/);
  assert.equal(generated.includes("# Webstudio MCP Manual"), false);
});

test("rejects an unexpected CLI manual", () => {
  assert.throws(
    () => renderMcpDocumentation("# Different manual"),
    /Expected the CLI manual/
  );
});
