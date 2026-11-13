import { describe, expect, test, vi } from "vitest";
import { runConcurrently } from "./suite-runner";

describe("evaluation suite runner", () => {
  test("starts independent evaluations together and preserves result order", async () => {
    const releases = Promise.withResolvers<void>();
    const started: number[] = [];
    const pending = runConcurrently([3, 1, 2], async (value) => {
      started.push(value);
      await releases.promise;
      return value * 2;
    });

    await vi.waitFor(() => expect(started).toEqual([3, 1, 2]));
    releases.resolve();
    await expect(pending).resolves.toEqual([6, 2, 4]);
  });

  test("bounds concurrent evaluations and preserves result order", async () => {
    const active = new Set<number>();
    let peakConcurrency = 0;
    const results = await runConcurrently(
      [0, 1, 2, 3, 4],
      async (value) => {
        active.add(value);
        peakConcurrency = Math.max(peakConcurrency, active.size);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active.delete(value);
        return value * 2;
      },
      2
    );

    expect(peakConcurrency).toBe(2);
    expect(results).toEqual([0, 2, 4, 6, 8]);
  });

  test("waits for every evaluation to clean up before reporting failures", async () => {
    const cleanedUp: string[] = [];
    await expect(
      runConcurrently(["failed", "completed"], async (value) => {
        try {
          if (value === "failed") {
            throw new Error("evaluation failed");
          }
          return value;
        } finally {
          cleanedUp.push(value);
        }
      })
    ).rejects.toThrow("evaluation failed");
    expect(cleanedUp).toEqual(expect.arrayContaining(["failed", "completed"]));
  });
});
