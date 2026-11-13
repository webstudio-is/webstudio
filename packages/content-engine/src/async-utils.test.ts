import { describe, expect, test } from "vitest";
import { createConcurrencyLimiter, mapBounded } from "./async-utils";

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

  test("does not start queued work after cancellation", async () => {
    const controller = new AbortController();
    const limit = createConcurrencyLimiter({
      concurrency: 1,
      signal: controller.signal,
    });
    let releaseFirst = () => {};
    let firstStarted = false;
    const first = limit(
      () =>
        new Promise<void>((resolve) => {
          firstStarted = true;
          releaseFirst = resolve;
        })
    );
    let secondStarted = false;
    const second = limit(async () => {
      secondStarted = true;
    });
    const secondOutcome = second.then(
      () => "resolved",
      (error) => error
    );

    await expect.poll(() => firstStarted).toBe(true);
    releaseFirst();
    await Promise.resolve();
    const reason = new Error("cancelled");
    controller.abort(reason);

    await first;
    await expect(secondOutcome).resolves.toBe(reason);
    expect(secondStarted).toBe(false);
  });

  test("rejects invalid concurrency instead of silently skipping work", async () => {
    await expect(mapBounded([1], 0, async () => {})).rejects.toThrow(
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
