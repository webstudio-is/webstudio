import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpDocumentation } from "./generate-mcp-docs.js";

test("renders GitBook metadata around the complete CLI manual", () => {
  const generated = renderMcpDocumentation({
    manual: "# Webstudio MCP Manual\n\n## Startup\n\nStart here.\n",
    version: "0.285.0",
  });

  assert.match(generated, /^---\n/);
  assert.match(generated, /# Webstudio MCP\n/);
  assert.match(generated, /Webstudio CLI \*\*v0\.285\.0\*\*/);
  assert.match(
    generated,
    /See \[CLI\]\(cli\.md\) for Node\.js and `npx` setup/
  );
  assert.match(generated, /## Startup\n\nStart here\./);
  assert.match(generated, /## Related\n/);
  assert.equal(generated.includes("# Webstudio MCP Manual"), false);
});

test("rejects an unexpected CLI manual", () => {
  assert.throws(
    () =>
      renderMcpDocumentation({
        manual: "# Different manual",
        version: "0.285.0",
      }),
    /Expected the CLI manual/
  );
});
