import { humanizeString } from "~/shared/string-utils";

export type ValidationResult = {
  valid: boolean;
  message?: string;
  type?: "pseudo-class" | "pseudo-element" | "complex-selector";
};

export type ComponentState = {
  category: "states" | "component-states";
  selector: string;
  label: string;
};

/**
 * Validates CSS selector syntax
 * Supports:
 * - Pseudo classes: :hover, :focus-visible, :has()
 * - Pseudo elements: ::before, ::after, ::placeholder
 * - Complex selectors: :has(:focus-visible), :not(:disabled)
 */
export const validateSelector = (selector: string): ValidationResult => {
  // Empty selector is valid (removes state)
  if (!selector.trim()) {
    return { valid: true };
  }

  // Must start with : or ::
  if (!selector.startsWith(":")) {
    return {
      valid: false,
      message:
        "Selector must start with : (pseudo-class) or :: (pseudo-element)",
    };
  }

  // Try to validate using browser's querySelector
  try {
    // Test if selector is valid by attempting to use it
    // We use a dummy element to avoid affecting the actual DOM
    const testElement = document.createElement("div");
    testElement.matches(selector);
    return {
      valid: true,
      type: selector.startsWith("::") ? "pseudo-element" : "pseudo-class",
    };
  } catch (error) {
    // Check if it's a functional pseudo-class that querySelector can't handle in matches()
    const functionalPseudoClasses = [
      ":has",
      ":is",
      ":where",
      ":not",
      ":nth-child",
      ":nth-of-type",
      ":nth-last-child",
      ":nth-last-of-type",
    ];

    const isFunctional = functionalPseudoClasses.some((pc) =>
      selector.startsWith(pc + "(")
    );

    if (isFunctional) {
      // Basic validation for functional pseudo-classes
      const openParens = (selector.match(/\(/g) || []).length;
      const closeParens = (selector.match(/\)/g) || []).length;
      if (openParens === closeParens && openParens > 0) {
        return { valid: true, type: "complex-selector" };
      }
    }

    // Check for pseudo-elements that can't be tested with matches()
    const pseudoElements = [
      "::before",
      "::after",
      "::first-line",
      "::first-letter",
      "::selection",
      "::placeholder",
      "::marker",
      "::backdrop",
    ];

    if (pseudoElements.some((pe) => selector.startsWith(pe))) {
      return { valid: true, type: "pseudo-element" };
    }

    return {
      valid: false,
      message: "Invalid CSS selector syntax",
    };
  }
};

/**
 * Generates a human-readable label for a selector
 */
export const getSelectorLabel = (
  selector: string,
  predefinedStates: ComponentState[]
): string => {
  // Check if we have a predefined label
  const predefined = predefinedStates.find((s) => s.selector === selector);
  if (predefined) {
    return predefined.label;
  }

  // Generate label from selector
  // ::before -> Before
  // :hover -> Hover
  // :has(:focus-visible) -> Has Focus Visible
  return humanizeString(selector.replace(/^::?/, ""));
};
