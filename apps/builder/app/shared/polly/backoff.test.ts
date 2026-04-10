/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { createBackoff } from "./backoff";

describe("createBackoff", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Deterministic (jitter=false) ─────────────────────────────

  describe("deterministic (jitter=false)", () => {
    test("first delay equals baseDelay", () => {
      const backoff = createBackoff({
        baseDelay: 1000,
        multiplier: 2,
        jitter: false,
      });

      expect(backoff.next()).toBe(1000);
    });

    test("delays grow exponentially", () => {
      const backoff = createBackoff({
        baseDelay: 100,
        multiplier: 2,
        jitter: false,
      });

      expect(backoff.next()).toBe(100); // 100 * 2^0
      expect(backoff.next()).toBe(200); // 100 * 2^1
      expect(backoff.next()).toBe(400); // 100 * 2^2
      expect(backoff.next()).toBe(800); // 100 * 2^3
    });

    test("clamps at maxDelay", () => {
      const backoff = createBackoff({
        baseDelay: 1000,
        multiplier: 10,
        maxDelay: 5000,
        jitter: false,
      });

      expect(backoff.next()).toBe(1000);
      expect(backoff.next()).toBe(5000); // Would be 10000, clamped
      expect(backoff.next()).toBe(5000); // Stays clamped
    });

    test("reset restores initial state", () => {
      const backoff = createBackoff({
        baseDelay: 100,
        multiplier: 3,
        jitter: false,
      });

      backoff.next(); // 100
      backoff.next(); // 300
      backoff.next(); // 900

      backoff.reset();

      expect(backoff.attempts()).toBe(0);
      expect(backoff.next()).toBe(100); // Back to start
    });

    test("attempts tracks failure count", () => {
      const backoff = createBackoff({ jitter: false });

      expect(backoff.attempts()).toBe(0);
      backoff.next();
      expect(backoff.attempts()).toBe(1);
      backoff.next();
      expect(backoff.attempts()).toBe(2);
    });
  });

  // ── Jitter (default) ──────────────────────────────────────────

  describe("jitter (default)", () => {
    test("delays are within expected range", () => {
      // Fix Math.random to midpoint (0.5)
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const backoff = createBackoff({
        baseDelay: 1000,
        multiplier: 3,
        maxDelay: 120_000,
      });

      // First: random(1000, 1000 * 3) = random(1000, 3000) at 0.5 → 2000
      expect(backoff.next()).toBe(2000);

      // Second: random(1000, 2000 * 3) = random(1000, 6000) at 0.5 → 3500
      expect(backoff.next()).toBe(3500);
    });

    test("clamps at maxDelay with jitter", () => {
      // Force Math.random to return 1.0 (max)
      vi.spyOn(Math, "random").mockReturnValue(0.999999);

      const backoff = createBackoff({
        baseDelay: 1000,
        multiplier: 3,
        maxDelay: 5000,
      });

      // Keep calling until we exceed max
      for (let i = 0; i < 20; i++) {
        expect(backoff.next()).toBeLessThanOrEqual(5000);
      }
    });

    test("delays are never below baseDelay", () => {
      // Force Math.random to return 0 (min)
      vi.spyOn(Math, "random").mockReturnValue(0);

      const backoff = createBackoff({
        baseDelay: 500,
        multiplier: 3,
      });

      for (let i = 0; i < 10; i++) {
        expect(backoff.next()).toBeGreaterThanOrEqual(500);
      }
    });

    test("uses defaults when no options provided", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const backoff = createBackoff();

      // Default: baseDelay=5000, multiplier=3, maxDelay=120000
      // First: random(5000, 5000 * 3) at 0.5 → 10000
      const first = backoff.next();
      expect(first).toBe(10_000);
      expect(backoff.attempts()).toBe(1);
    });
  });
});
