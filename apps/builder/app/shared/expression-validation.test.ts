import { expect, test } from "vitest";
import {
  getExpressionErrorMessages,
  hasExpressionDiagnostics,
} from "./expression-validation";

test("returns only expression error messages", () => {
  expect(getExpressionErrorMessages({ expression: "invalid {" })).not.toEqual(
    []
  );
});

test("detects expression diagnostics", () => {
  expect(hasExpressionDiagnostics({ expression: "invalid {" })).toBe(true);
  expect(hasExpressionDiagnostics({ expression: '"value"' })).toBe(false);
});
