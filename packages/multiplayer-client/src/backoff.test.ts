import { beforeEach, describe, expect, test, vi } from "vitest";
import { createBackoff } from "./backoff";

describe("createBackoff", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("deterministic mode", () => {
    test("starts with base delay", () => {
      const backoff = createBackoff({
        baseDelay: 1000,
        jitter: false,
        multiplier: 2,
      });

      expect(backoff.next()).toBe(1000);
    });

    test("grows exponentially", () => {
      const backoff = createBackoff({
        baseDelay: 100,
        jitter: false,
        multiplier: 2,
      });

      expect(backoff.next()).toBe(100);
      expect(backoff.next()).toBe(200);
      expect(backoff.next()).toBe(400);
      expect(backoff.next()).toBe(800);
    });

    test("clamps at max delay", () => {
      const backoff = createBackoff({
        baseDelay: 1000,
        jitter: false,
        maxDelay: 5000,
        multiplier: 10,
      });

      expect(backoff.next()).toBe(1000);
      expect(backoff.next()).toBe(5000);
      expect(backoff.next()).toBe(5000);
    });

    test("resets delay and attempts", () => {
      const backoff = createBackoff({
        baseDelay: 100,
        jitter: false,
        multiplier: 3,
      });

      backoff.next();
      backoff.next();
      backoff.next();
      backoff.reset();

      expect(backoff.attempts()).toBe(0);
      expect(backoff.next()).toBe(100);
    });

    test("tracks attempts", () => {
      const backoff = createBackoff({ jitter: false });

      expect(backoff.attempts()).toBe(0);
      backoff.next();
      expect(backoff.attempts()).toBe(1);
      backoff.next();
      expect(backoff.attempts()).toBe(2);
    });
  });

  describe("jitter mode", () => {
    test("uses decorrelated jitter", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const backoff = createBackoff({
        baseDelay: 1000,
        maxDelay: 120_000,
        multiplier: 3,
      });

      expect(backoff.next()).toBe(2000);
      expect(backoff.next()).toBe(3500);
    });

    test("never exceeds max delay", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999999);

      const backoff = createBackoff({
        baseDelay: 1000,
        maxDelay: 5000,
        multiplier: 3,
      });

      for (let index = 0; index < 20; index += 1) {
        expect(backoff.next()).toBeLessThanOrEqual(5000);
      }
    });

    test("never goes below base delay", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const backoff = createBackoff({
        baseDelay: 500,
        multiplier: 3,
      });

      for (let index = 0; index < 10; index += 1) {
        expect(backoff.next()).toBeGreaterThanOrEqual(500);
      }
    });

    test("uses builder-compatible defaults", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const backoff = createBackoff();

      expect(backoff.next()).toBe(10_000);
      expect(backoff.attempts()).toBe(1);
    });
  });
});
