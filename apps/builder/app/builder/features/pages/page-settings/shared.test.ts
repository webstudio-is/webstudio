import { describe, expect, test } from "vitest";
import { computeExpression } from "@webstudio-is/project-build/runtime";

describe("page settings expression values", () => {
  test("renders literal and computed values as text", async () => {
    await expect(computeExpression(`"Page title"`, new Map())).resolves.toBe(
      "Page title"
    );
    await expect(computeExpression("42", new Map())).resolves.toBe(42);
  });

  test("does not expose missing expression values as text", async () => {
    await expect(computeExpression("missingVariable", new Map())).resolves.toBe(
      undefined
    );
    await expect(computeExpression("null", new Map())).resolves.toBe(null);
  });
});
