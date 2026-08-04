import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const runStepScript = join(process.cwd(), "e2e/run-step.sh");

test.runIf(process.platform !== "win32")(
  "stops descendant processes when a step times out",
  () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "run-step-"));
    const survivedFile = join(temporaryDirectory, "survived");
    const descendantScript = join(temporaryDirectory, "descendant.sh");

    try {
      writeFileSync(
        descendantScript,
        `#!/usr/bin/env bash
trap '' TERM
sleep 2
touch "$SURVIVED_FILE"
`
      );

      const result = spawnSync(
        "bash",
        [
          "-c",
          `
            source "$RUN_STEP_SCRIPT"
            spawn_descendant() {
              bash "$DESCENDANT_SCRIPT" &
              wait
            }
            run_step "test descendant cleanup" 1 spawn_descendant
          `,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            DESCENDANT_SCRIPT: descendantScript,
            RUN_STEP_SCRIPT: runStepScript,
            RUN_STEP_TERMINATION_GRACE_SECONDS: "0.1",
            SURVIVED_FILE: survivedFile,
          },
          timeout: 15_000,
        }
      );

      expect(result.status).toBe(124);
      expect(existsSync(survivedFile)).toBe(false);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }
);
