import { describe, expect, test } from "vitest";
import type { CssProperty } from "@webstudio-is/css-engine";
import type { Modifiers } from "../../shared/modifier-keys";
import { getChangeCompleteModifiers } from "./input-popover-utils";

describe("getChangeCompleteModifiers", () => {
  const getActiveProperties = (modifiers?: Modifiers): CssProperty[] => {
    if (modifiers?.shiftKey) {
      return ["padding-top", "padding-right", "padding-bottom", "padding-left"];
    }
    if (modifiers?.altKey) {
      return ["padding-top", "padding-bottom"];
    }
    return ["padding-top"];
  };

  test("ignores shift key for arrow key deltas", () => {
    const modifiers = getChangeCompleteModifiers({
      type: "delta",
      altKey: false,
      shiftKey: true,
    });

    expect(getActiveProperties(modifiers)).toEqual(["padding-top"]);
    expect(modifiers).toBeUndefined();
  });

  test("ignores alt key for arrow key deltas", () => {
    const modifiers = getChangeCompleteModifiers({
      type: "delta",
      altKey: true,
      shiftKey: false,
    });

    expect(getActiveProperties(modifiers)).toEqual(["padding-top"]);
    expect(modifiers).toBeUndefined();
  });

  test("preserves shift key for non-delta completions", () => {
    const modifiers = getChangeCompleteModifiers({
      type: "enter",
      altKey: false,
      shiftKey: true,
    });

    expect(getActiveProperties(modifiers)).toEqual([
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
    ]);
    expect(modifiers).toEqual({
      altKey: false,
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
    });
  });

  test("preserves alt key for non-delta completions", () => {
    const modifiers = getChangeCompleteModifiers({
      type: "enter",
      altKey: true,
      shiftKey: false,
    });

    expect(getActiveProperties(modifiers)).toEqual([
      "padding-top",
      "padding-bottom",
    ]);
    expect(modifiers).toEqual({
      altKey: true,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    });
  });
});
