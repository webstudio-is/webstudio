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
