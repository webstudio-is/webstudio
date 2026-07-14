import { describe, expect, test } from "vitest";
import { computePageSettingsText } from "./shared";

describe("computePageSettingsText", () => {
  test("renders literal and computed values as text", () => {
    expect(computePageSettingsText(`"Page title"`, new Map())).toBe(
      "Page title"
    );
    expect(computePageSettingsText("42", new Map())).toBe("42");
  });

  test("does not expose missing expression values as text", () => {
    expect(computePageSettingsText("missingVariable", new Map())).toBe("");
    expect(computePageSettingsText("null", new Map())).toBe("");
  });
});
