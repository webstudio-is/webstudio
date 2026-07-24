import { describe, expect, test } from "vitest";
import { mapBounded, runBounded } from "./async-utils";

describe("bounded async work", () => {
  test("limits concurrency and preserves result order", async () => {
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    const pending = mapBounded([3, 2, 1], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return value * 2;
    });

    await expect.poll(() => releases.length).toBe(2);
    releases.shift()?.();
    await expect.poll(() => releases.length).toBe(2);
    releases.shift()?.();
    releases.shift()?.();

    await expect(pending).resolves.toEqual([6, 4, 2]);
    expect(maximumActive).toBe(2);
  });

  test("rejects invalid concurrency instead of silently skipping work", async () => {
    await expect(runBounded([1], 0, async () => {})).rejects.toThrow(
      "Concurrency must be a positive safe integer"
    );
  });

  test("waits for every started worker before propagating a failure", async () => {
    let release: (() => void) | undefined;
    let completed = false;
    let rejected = false;
    const pending = mapBounded(["fail", "slow"], 2, async (value) => {
      if (value === "fail") {
        throw new Error("failed");
      }
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      completed = true;
      return value;
    });
    const observed = pending.catch((error) => {
      rejected = true;
      throw error;
    });

    await expect.poll(() => release).toBeTypeOf("function");
    expect(rejected).toBe(false);
    release?.();

    await expect(observed).rejects.toThrow("failed");
    expect(completed).toBe(true);
  });
});
