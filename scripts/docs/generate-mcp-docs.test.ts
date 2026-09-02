import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpDocumentation } from "./generate-mcp-docs.js";

test("renders GitBook metadata around the complete CLI manual", () => {
  const generated = renderMcpDocumentation(
    "# Webstudio MCP Manual\n\n## Startup\n\nStart here.\n",
    "1.2.3"
  );

  assert.match(generated, /^---\n/);
  assert.match(
    generated,
    /# Webstudio MCP\n\n\*\*Webstudio MCP v1\.2\.3\*\*\n/
  );
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
    () => renderMcpDocumentation("# Different manual", "1.2.3"),
    /Expected the CLI manual/
  );
});

test("rejects a missing CLI version", () => {
  assert.throws(
    () => renderMcpDocumentation("# Webstudio MCP Manual\n\nBody", ""),
    /Expected a CLI version/
  );
});
