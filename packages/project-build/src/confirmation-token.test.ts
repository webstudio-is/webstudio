import { describe, expect, test, vi } from "vitest";
import {
  canonicalizeConfirmationValue,
  createConfirmationToken,
  validateConfirmationToken,
} from "./confirmation-token";

describe("confirmation tokens", () => {
  test("bind a token to its signature and expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T12:00:00Z"));
    const { token } = await createConfirmationToken("original", 1_000);

    expect(await validateConfirmationToken(token, "original")).toBe(true);
    expect(await validateConfirmationToken(token, "changed")).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(await validateConfirmationToken(token, "original")).toBe(false);
    vi.useRealTimers();
  });

  test("canonicalizes object keys without reordering arrays", () => {
    expect(
      JSON.stringify(
        canonicalizeConfirmationValue({ b: 2, a: [{ d: 4, c: 3 }, 1] })
      )
    ).toBe('{"a":[{"c":3,"d":4},1],"b":2}');
  });
});
