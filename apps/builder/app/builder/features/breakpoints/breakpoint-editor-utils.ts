import type { Breakpoint } from "@webstudio-is/sdk";

/**
 * Determines if a breakpoint is condition-based (has a custom media query condition).
 */
export const isConditionBasedBreakpoint = (breakpoint: {
  condition?: string;
}): boolean => {
  return (
    breakpoint.condition !== undefined && breakpoint.condition.trim() !== ""
  );
};

/**
 * Determines if a breakpoint is width-based (has minWidth or maxWidth).
 */
export const isWidthBasedBreakpoint = (breakpoint: {
  minWidth?: number;
  maxWidth?: number;
}): boolean => {
  return breakpoint.minWidth !== undefined || breakpoint.maxWidth !== undefined;
};

/**
 * Validates if a breakpoint has valid data (either condition or width).
 */
export const isValidBreakpoint = (breakpoint: {
  condition?: string;
  minWidth?: number;
  maxWidth?: number;
}): boolean => {
  return (
    isConditionBasedBreakpoint(breakpoint) || isWidthBasedBreakpoint(breakpoint)
  );
};

/**
 * Builds a breakpoint from editor state, ensuring only condition OR width is set.
 * Returns undefined if the breakpoint is invalid.
 */
export const buildBreakpointFromEditorState = (
  id: string,
  label: string,
  conditionValue: string,
  widthType: "minWidth" | "maxWidth",
  widthValue: number,
  originalBreakpoint?: Breakpoint
): Breakpoint | undefined => {
  const trimmedLabel = label.trim();
  const trimmedCondition = conditionValue.trim();
  const hasCondition = trimmedCondition !== "";

  const newBreakpoint: Breakpoint = {
    id,
    label: trimmedLabel || originalBreakpoint?.label || "",
  };

  if (hasCondition) {
    // Condition-based: only set condition
    newBreakpoint.condition = trimmedCondition;
  } else if (widthValue !== undefined && widthValue >= 0) {
    // Width-based: only set width (zero is valid for base breakpoints)
    newBreakpoint[widthType] = widthValue;
  } else if (originalBreakpoint?.condition !== undefined) {
    // Preserve existing condition if input was cleared
    newBreakpoint.condition = originalBreakpoint.condition;
  } else {
    // Invalid: no condition and no valid width
    return;
  }

  return newBreakpoint;
};

/**
 * Detects if there are unsaved changes in the editor state compared to original breakpoint.
 */
export const hasUnsavedChanges = (
  originalBreakpoint: Breakpoint,
  label: string,
  conditionValue: string,
  widthType: "minWidth" | "maxWidth",
  widthValue: number
): boolean => {
  if (label !== originalBreakpoint.label) {
    return true;
  }

  if (conditionValue !== (originalBreakpoint.condition ?? "")) {
    return true;
  }

  // For width-based breakpoints, check if width changed
  if (originalBreakpoint.condition === undefined) {
    const originalWidth = originalBreakpoint[widthType] ?? 0;
    if (widthValue !== originalWidth) {
      return true;
    }
  }

  return false;
};
