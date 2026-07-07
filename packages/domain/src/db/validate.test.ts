import { describe, test, expect } from "vitest";
import { validateDomain } from "./validate";

describe("validateDomain", () => {
  test("accepts a valid two-level domain", () => {
    expect(validateDomain("example.com")).toEqual({
      success: true,
      domain: "example.com",
    });
  });

  test("accepts a valid three-level domain", () => {
    expect(validateDomain("sub.example.com")).toEqual({
      success: true,
      domain: "sub.example.com",
    });
  });

  test("accepts a valid four-level domain", () => {
    expect(validateDomain("a.b.example.com")).toEqual({
      success: true,
      domain: "a.b.example.com",
    });
  });

  test("rejects a single-level domain (no dot)", () => {
    const result = validateDomain("localhost");
    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch("at least two levels");
  });

  test("rejects a five-level domain", () => {
    const result = validateDomain("a.b.c.example.com");
    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toMatch("at most four levels");
  });

  test("rejects obviously invalid input", () => {
    const result = validateDomain("not a domain!!!");
    expect(result.success).toBe(false);
  });
});
