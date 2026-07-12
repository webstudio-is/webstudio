import { expect, test, vi } from "vitest";
import { runWithTimeout } from "./timeout";

test("aborts, cleans up, and waits for timed-out work to settle", async () => {
  const events: string[] = [];
  let releaseTask: (() => void) | undefined;
  const cleanup = vi.fn(async () => {
    events.push("cleanup");
    releaseTask?.();
  });

  await expect(
    runWithTimeout({
      name: "slow test",
      timeoutMs: 1,
      onTimeout: cleanup,
      task: async () => {
        await new Promise<void>((resolve) => {
          releaseTask = () => {
            events.push("settled");
            resolve();
          };
        });
      },
    })
  ).rejects.toThrow("Timed out after 1ms: slow test");

  expect(cleanup).toHaveBeenCalledOnce();
  expect(events).toEqual(["cleanup", "settled"]);
});

test("preserves timeout semantics when cleanup rejects", async () => {
  const cleanupError = new Error("cleanup failed");
  let releaseTask: (() => void) | undefined;

  const result = runWithTimeout({
    name: "cleanup failure",
    timeoutMs: 1,
    settleTimeoutMs: 50,
    onTimeout: async () => {
      releaseTask?.();
      throw cleanupError;
    },
    task: async () => {
      await new Promise<void>((resolve) => {
        releaseTask = resolve;
      });
    },
  });

  await expect(result).rejects.toMatchObject({
    message: "Timed out after 1ms: cleanup failure",
    cause: cleanupError,
  });
});

test("fails within the settlement grace period when work ignores cancellation", async () => {
  const startedAt = Date.now();

  await expect(
    runWithTimeout({
      name: "uncooperative test",
      timeoutMs: 1,
      settleTimeoutMs: 1,
      task: async () => await new Promise<never>(() => undefined),
    })
  ).rejects.toThrow(
    "Timed out after 1ms: uncooperative test; task did not settle within 1ms"
  );

  expect(Date.now() - startedAt).toBeLessThan(100);
});
