import { describe, expect, test } from "vitest";
import {
  getExpressionErrorMessages,
  getNamedExpressionErrors,
  hasExpressionDiagnostics,
} from "./expression-validation";

describe("getNamedExpressionErrors", () => {
  test("returns no errors for omitted expressions", () => {
    expect(getNamedExpressionErrors("title", undefined)).toEqual([]);
  });

  test("formats parser errors with name and optional hint", () => {
    expect(
      getNamedExpressionErrors("title", "not valid js", {
        hint: "Use a quoted string for fixed text.",
      })[0]
    ).toMatch(
      /^title: Invalid expression: Use a quoted string for fixed text\.: Parser detail:/
    );
  });

  test("detects any expression diagnostic", () => {
    expect(hasExpressionDiagnostics({ expression: "invalid {" })).toBe(true);
    expect(hasExpressionDiagnostics({ expression: '"value"' })).toBe(false);
  });

  test("returns only expression error messages", () => {
    expect(getExpressionErrorMessages({ expression: "invalid {" })).not.toEqual(
      []
    );
  });
});
