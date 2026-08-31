import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const runStepLibrary = join(import.meta.dirname, "run-step.sh");

test("automated steps do not read from the caller's terminal", async () => {
  const { stdout } = await execFileAsync("bash", [
    "-c",
    [
      'source "$1"',
      "reject_input() {",
      "  if read -r; then",
      "    return 1",
      "  fi",
      "}",
      'run_step "closed stdin" 2 reject_input <<< "terminal input"',
    ].join("\n"),
    "bash",
    runStepLibrary,
  ]);

  expect(stdout).toContain("✓ closed stdin");
});
