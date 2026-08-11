import assert from "node:assert/strict";
import test from "node:test";
import { renderContentEngineDocumentation } from "./generate-content-engine-docs.js";

test("renders the shared reference inside a generated GitBook page", () => {
  const reference =
    "# Content Engine reference\n\n## Result modes\n\nReference body.\n";
  const generated = renderContentEngineDocumentation(reference);

  assert.ok(generated.startsWith("---\n"));
  assert.ok(generated.includes(reference.trim()));
  assert.equal(generated.includes("{{reference}}"), false);
});

test("rejects an unexpected CLI manual", () => {
  assert.throws(
    () => renderContentEngineDocumentation("# Different manual"),
    /Expected the CLI manual/
  );
});
