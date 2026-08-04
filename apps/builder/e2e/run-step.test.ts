import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const runStepScript = join(process.cwd(), "e2e/run-step.sh");

test.runIf(process.platform !== "win32")(
  "stops descendant processes when a step times out",
  () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "run-step-"));
    const childPidFile = join(temporaryDirectory, "child.pid");
    let childPid: number | undefined;

    try {
      const result = spawnSync(
        "bash",
        [
          "-c",
          `
            source "$RUN_STEP_SCRIPT"
            spawn_descendant() {
              bash -c 'trap "" TERM; while true; do sleep 1; done' &
              echo "$!" > "$CHILD_PID_FILE"
              wait
            }
            run_step "test descendant cleanup" 1 spawn_descendant
          `,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            CHILD_PID_FILE: childPidFile,
            RUN_STEP_TERMINATION_GRACE_SECONDS: "0.1",
            RUN_STEP_SCRIPT: runStepScript,
          },
          timeout: 15_000,
        }
      );

      childPid = Number(readFileSync(childPidFile, "utf8"));
      expect(result.status).toBe(124);
      expect(() => process.kill(childPid as number, 0)).toThrow(
        expect.objectContaining({ code: "ESRCH" })
      );
    } finally {
      if (childPid !== undefined) {
        try {
          process.kill(childPid, "SIGKILL");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
            throw error;
          }
        }
      }
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }
);
