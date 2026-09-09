import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

test.each([[], ["--reporter=line"]])(
  "validates E2E selection before starting services with arguments %j",
  (...args) => {
    const directory = mkdtempSync(join(tmpdir(), "e2e-selection-"));
    const capture = join(directory, "arguments.json");
    try {
      // Stop at the package-manager boundary: no Docker or database work runs.
      writeFileSync(
        join(directory, "pnpm"),
        `#!${process.execPath}\nrequire("node:fs").writeFileSync(process.env.ARGUMENT_CAPTURE, JSON.stringify(process.argv.slice(2))); process.exit(73);\n`,
        { mode: 0o755 }
      );
      const result = spawnSync(
        "/bin/bash",
        [join(import.meta.dirname, "run.sh"), "run", ...args],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            ARGUMENT_CAPTURE: capture,
            E2E_SKIP_CLEANUP: "true",
            E2E_RUN_TESTS: "true",
            SCHEMA_SNAPSHOT: join(directory, "unused.sql"),
          },
          timeout: 10_000,
        }
      );
      expect(result.status, result.stderr).toBe(73);
      expect(JSON.parse(readFileSync(capture, "utf8"))).toEqual([
        "e2e:ci",
        "--list",
        ...args,
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
);
