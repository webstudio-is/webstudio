import assert from "node:assert/strict";
import test from "node:test";
import { renderMcpDocumentation } from "./generate-mcp-docs.js";

test("renders GitBook metadata around the complete CLI manual", () => {
  const manualBody = "## manual-marker\n\nmanual-body-marker";
  const version = "version-marker";
  const generated = renderMcpDocumentation(
    `# Webstudio MCP Manual\r\n\r\n${manualBody.replaceAll("\n", "\r\n")}\r\n`,
    version
  );

  assert.equal(generated.startsWith("---\n"), true);
  assert.equal(generated.includes("\r"), false);
  assert.equal(generated.split(version).length - 1, 1);
  assert.equal(generated.split(manualBody).length - 1, 1);
  assert.equal(generated.includes("{{version}}"), false);
  assert.equal(generated.includes("{{manual}}"), false);
  assert.equal(generated.includes("# Webstudio MCP Manual"), false);
});

test("rejects an unexpected CLI manual", () => {
  assert.throws(() => renderMcpDocumentation("# Different manual", "1.2.3"));
});

test("rejects a missing CLI version", () => {
  assert.throws(() =>
    renderMcpDocumentation("# Webstudio MCP Manual\n\nBody", "")
  );
});
