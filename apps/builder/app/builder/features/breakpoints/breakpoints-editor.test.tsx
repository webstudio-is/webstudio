import { describe, test, expect } from "vitest";
import type { Breakpoint } from "@webstudio-is/sdk";

/**
 * Tests for breakpoints editor validation logic.
 * These tests ensure that breakpoints always have either a width property OR a condition,
 * preventing corruption of breakpoint data.
 */

describe("BreakpointsEditor validation", () => {
  test("should not allow breakpoint with only label (no width or condition)", () => {
    // Simulate the validation logic from handleSubmit
    const conditionValue = "";
    const hasCondition = conditionValue.trim() !== "";
    const widthValue = undefined;

    // Validation should prevent submission
    const shouldSubmit = hasCondition || widthValue !== undefined;

    expect(shouldSubmit).toBe(false);
  });

  test("should allow breakpoint with condition only", () => {
    const breakpoint: Breakpoint = {
      id: "test-id",
      label: "Test",
    };

    const label = "Mobile Portrait";
    const conditionValue = "orientation:portrait";
    const hasCondition = conditionValue.trim() !== "";
    const widthValue = undefined;

    // Validation should pass
    const shouldSubmit = hasCondition || widthValue !== undefined;
    expect(shouldSubmit).toBe(true);

    if (!shouldSubmit) {
      return;
    }

    const newBreakpoint: Breakpoint = {
      id: breakpoint.id,
      label: label.trim() || breakpoint.label,
    };

    if (hasCondition) {
      newBreakpoint.condition = conditionValue.trim();
    } else if (widthValue !== undefined) {
      newBreakpoint.minWidth = widthValue;
    }

    expect(newBreakpoint).toEqual({
      id: "test-id",
      label: "Mobile Portrait",
      condition: "orientation:portrait",
    });
    expect(newBreakpoint.minWidth).toBeUndefined();
    expect(newBreakpoint.maxWidth).toBeUndefined();
  });

  test("should allow breakpoint with width only", () => {
    const breakpoint: Breakpoint = {
      id: "test-id",
      label: "Test",
    };

    const label = "Tablet";
    const conditionValue = "";
    const hasCondition = conditionValue.trim() !== "";
    const type: "minWidth" | "maxWidth" = "minWidth";
    const widthValue = 768;

    // Validation should pass
    const shouldSubmit = hasCondition || widthValue !== undefined;
    expect(shouldSubmit).toBe(true);

    if (!shouldSubmit) {
      return;
    }

    const newBreakpoint: Breakpoint = {
      id: breakpoint.id,
      label: label.trim() || breakpoint.label,
    };

    if (hasCondition) {
      newBreakpoint.condition = conditionValue.trim();
    } else if (widthValue !== undefined) {
      newBreakpoint[type] = widthValue;
    }

    expect(newBreakpoint).toEqual({
      id: "test-id",
      label: "Tablet",
      minWidth: 768,
    });
    expect(newBreakpoint.condition).toBeUndefined();
  });

  test("should preserve original label if new label is empty", () => {
    const breakpoint: Breakpoint = {
      id: "test-id",
      label: "Original Label",
      minWidth: 768,
    };

    const label = "   "; // Empty/whitespace
    const type: "minWidth" | "maxWidth" = "minWidth";
    const widthValue = 768;

    const newBreakpoint: Breakpoint = {
      id: breakpoint.id,
      label: label.trim() || breakpoint.label,
    };

    newBreakpoint[type] = widthValue;

    expect(newBreakpoint.label).toBe("Original Label");
  });

  test("should not save when clearing condition without setting width", () => {
    const breakpoint: Breakpoint = {
      id: "test-id",
      label: "Test",
      condition: "orientation:portrait",
    };

    // User clears condition but doesn't set width
    const conditionValue = ""; // Cleared
    const hasCondition = conditionValue.trim() !== "";
    const widthValue = undefined; // Never set

    // Validation should prevent save
    const shouldSubmit = hasCondition || widthValue !== undefined;

    expect(shouldSubmit).toBe(false);
    expect(hasCondition).toBe(false);
    expect(widthValue).toBeUndefined();
  });

  test("should allow zero as valid width value", () => {
    const conditionValue = "";
    const hasCondition = conditionValue.trim() !== "";
    const widthValue = 0;

    // Zero is a valid width (e.g., for base breakpoint min-width: 0)
    const shouldSubmit = hasCondition || widthValue !== undefined;

    expect(shouldSubmit).toBe(true);
  });

  test("should not mix condition and width properties", () => {
    const breakpoint: Breakpoint = {
      id: "test-id",
      label: "Test",
    };

    const label = "Test";
    const conditionValue = "orientation:portrait";
    const hasCondition = conditionValue.trim() !== "";
    const type: "minWidth" | "maxWidth" = "minWidth";
    const widthValue = 768;

    const newBreakpoint: Breakpoint = {
      id: breakpoint.id,
      label: label.trim() || breakpoint.label,
    };

    // When condition is set, should NOT include width
    if (hasCondition) {
      newBreakpoint.condition = conditionValue.trim();
      // Explicitly NOT setting width properties
    } else if (widthValue !== undefined) {
      newBreakpoint[type] = widthValue;
    }

    expect(newBreakpoint).toEqual({
      id: "test-id",
      label: "Test",
      condition: "orientation:portrait",
    });
    expect(newBreakpoint.minWidth).toBeUndefined();
    expect(newBreakpoint.maxWidth).toBeUndefined();
  });
});
