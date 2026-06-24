import { describe, expect, test } from "vitest";
import { __testing__ } from "./inspector";

const { getInspectorEmptyStateMessage } = __testing__;

describe("getInspectorEmptyStateMessage", () => {
  test("describes empty and multi-selection states", () => {
    expect(getInspectorEmptyStateMessage(0)).toBe(
      "Select an instance on the canvas"
    );
    expect(getInspectorEmptyStateMessage(2)).toBe(
      "Multiple instances selected"
    );
  });
});
