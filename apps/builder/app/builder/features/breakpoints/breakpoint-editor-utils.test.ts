import { describe, test, expect } from "vitest";
import {
  isConditionBasedBreakpoint,
  isWidthBasedBreakpoint,
  isValidBreakpoint,
  buildBreakpointFromEditorState,
  hasUnsavedChanges,
} from "./breakpoint-editor-utils";

describe("breakpoint-editor-utils", () => {
  describe("isConditionBasedBreakpoint", () => {
    test("returns true for breakpoint with condition", () => {
      expect(
        isConditionBasedBreakpoint({ condition: "orientation:portrait" })
      ).toBe(true);
    });

    test("returns false for breakpoint with empty condition", () => {
      expect(isConditionBasedBreakpoint({ condition: "" })).toBe(false);
      expect(isConditionBasedBreakpoint({ condition: "  " })).toBe(false);
    });

    test("returns false for breakpoint without condition", () => {
      expect(isConditionBasedBreakpoint({})).toBe(false);
    });
  });

  describe("isWidthBasedBreakpoint", () => {
    test("returns true for breakpoint with minWidth", () => {
      expect(isWidthBasedBreakpoint({ minWidth: 1024 })).toBe(true);
    });

    test("returns true for breakpoint with maxWidth", () => {
      expect(isWidthBasedBreakpoint({ maxWidth: 768 })).toBe(true);
    });

    test("returns false for breakpoint without width", () => {
      expect(isWidthBasedBreakpoint({})).toBe(false);
    });
  });

  describe("isValidBreakpoint", () => {
    test("returns true for condition-based breakpoint", () => {
      expect(isValidBreakpoint({ condition: "orientation:portrait" })).toBe(
        true
      );
    });

    test("returns true for width-based breakpoint", () => {
      expect(isValidBreakpoint({ minWidth: 1024 })).toBe(true);
      expect(isValidBreakpoint({ maxWidth: 768 })).toBe(true);
    });

    test("returns false for breakpoint with neither condition nor width", () => {
      expect(isValidBreakpoint({})).toBe(false);
    });
  });

  describe("buildBreakpointFromEditorState", () => {
    test("builds condition-based breakpoint", () => {
      const result = buildBreakpointFromEditorState(
        "id1",
        "Portrait",
        "orientation:portrait",
        "minWidth",
        0,
        undefined
      );

      expect(result).toEqual({
        id: "id1",
        label: "Portrait",
        condition: "orientation:portrait",
      });
    });

    test("builds width-based breakpoint with minWidth", () => {
      const result = buildBreakpointFromEditorState(
        "id2",
        "Desktop",
        "",
        "minWidth",
        1024,
        undefined
      );

      expect(result).toEqual({
        id: "id2",
        label: "Desktop",
        minWidth: 1024,
      });
    });

    test("builds width-based breakpoint with maxWidth", () => {
      const result = buildBreakpointFromEditorState(
        "id3",
        "Mobile",
        "",
        "maxWidth",
        768,
        undefined
      );

      expect(result).toEqual({
        id: "id3",
        label: "Mobile",
        maxWidth: 768,
      });
    });

    test("allows zero as valid width (e.g., base breakpoint)", () => {
      const result = buildBreakpointFromEditorState(
        "id4",
        "Base",
        "",
        "minWidth",
        0,
        undefined
      );

      expect(result).toEqual({
        id: "id4",
        label: "Base",
        minWidth: 0,
      });
    });

    test("converts to width-based when condition is cleared", () => {
      const original = {
        id: "id5",
        label: "Portrait",
        condition: "orientation:portrait",
      };

      const result = buildBreakpointFromEditorState(
        "id5",
        "Portrait",
        "", // cleared condition
        "minWidth",
        0,
        original
      );

      // When condition is cleared with valid width (including 0), convert to width-based
      expect(result).toEqual({
        id: "id5",
        label: "Portrait",
        minWidth: 0,
      });
    });

    test("uses original label if new label is empty", () => {
      const original = {
        id: "id6",
        label: "Original",
        minWidth: 1024,
      };

      const result = buildBreakpointFromEditorState(
        "id6",
        "  ", // empty label
        "",
        "minWidth",
        1024,
        original
      );

      expect(result).toEqual({
        id: "id6",
        label: "Original",
        minWidth: 1024,
      });
    });
  });

  describe("hasUnsavedChanges", () => {
    test("returns true when label changed", () => {
      const original = { id: "1", label: "Old", minWidth: 1024 };
      expect(hasUnsavedChanges(original, "New", "", "minWidth", 1024)).toBe(
        true
      );
    });

    test("returns true when condition changed", () => {
      const original = {
        id: "1",
        label: "Test",
        condition: "orientation:portrait",
      };
      expect(
        hasUnsavedChanges(
          original,
          "Test",
          "orientation:landscape",
          "minWidth",
          0
        )
      ).toBe(true);
    });

    test("returns true when width value changed", () => {
      const original = { id: "1", label: "Test", minWidth: 1024 };
      expect(hasUnsavedChanges(original, "Test", "", "minWidth", 768)).toBe(
        true
      );
    });

    test("returns false when nothing changed", () => {
      const original = { id: "1", label: "Test", minWidth: 1024 };
      expect(hasUnsavedChanges(original, "Test", "", "minWidth", 1024)).toBe(
        false
      );
    });

    test("returns false for condition-based breakpoint with unchanged condition", () => {
      const original = {
        id: "1",
        label: "Test",
        condition: "orientation:portrait",
      };
      expect(
        hasUnsavedChanges(
          original,
          "Test",
          "orientation:portrait",
          "minWidth",
          0
        )
      ).toBe(false);
    });
  });
});
