import * as csstree from "css-tree";
import { pseudoElements } from "./__generated__/pseudo-elements";
import { pseudoClasses } from "./__generated__/pseudo-classes";

export type SelectorValidationResult =
  | { success: false; error: string }
  | { success: true; type: "pseudo-class" | "pseudo-element" | "attribute" };

/**
 * Validates a CSS pseudo-class, pseudo-element, or attribute selector
 * @param selector - The selector to validate (e.g., ":hover", "::before", "[data-state=open]")
 * @returns SelectorValidationResult with success status and type or error message
 */
export const validateSelector = (
  selector: string
): SelectorValidationResult => {
  if (!selector || selector.trim() === "") {
    return { success: false, error: "Selector cannot be empty" };
  }

  // Must start with a colon or bracket
  if (!selector.startsWith(":") && !selector.startsWith("[")) {
    return {
      success: false,
      error:
        "Selector must start with a colon (:) for pseudo-classes, double colon (::) for pseudo-elements, or bracket ([) for attribute selectors",
    };
  }

  try {
    // Parse as a rule to validate syntax
    // We wrap it in a dummy selector because css-tree requires a full rule
    const ast = csstree.parse(`dummy${selector} {}`);

    let foundPseudoClass = false;
    let foundPseudoElement = false;
    let foundAttribute = false;
    let pseudoClassName: string | undefined;
    let pseudoElementName: string | undefined;

    // Walk the AST to find pseudo-class, pseudo-element, or attribute selectors
    csstree.walk(ast, (node) => {
      if (node.type === "PseudoClassSelector") {
        foundPseudoClass = true;
        pseudoClassName = node.name;
      }
      if (node.type === "PseudoElementSelector") {
        foundPseudoElement = true;
        pseudoElementName = node.name;
      }
      if (node.type === "AttributeSelector") {
        foundAttribute = true;
      }
    });

    // Determine the type based on what we found
    if (foundPseudoElement) {
      // Validate that the pseudo-element actually exists
      // Some pseudo-elements are functional (e.g., ::part(), ::slotted())
      // The list includes both "part" and "part()" variants
      if (pseudoElementName) {
        const withParens = `${pseudoElementName}()`;
        if (
          (pseudoElements as readonly string[]).includes(pseudoElementName) ||
          (pseudoElements as readonly string[]).includes(withParens)
        ) {
          return { success: true, type: "pseudo-element" };
        }
      }
      // Invalid pseudo-element name
      return {
        success: false,
        error: "Invalid pseudo-element",
      };
    }

    if (foundPseudoClass) {
      // Check if it's actually a legacy pseudo-element (single colon)
      // Legacy syntax: :before, :after, :first-line, :first-letter
      if (
        pseudoClassName &&
        (pseudoElements as readonly string[]).includes(pseudoClassName)
      ) {
        return { success: true, type: "pseudo-element" };
      }

      // Validate that the pseudo-class actually exists
      // Some pseudo-classes are functional (e.g., :has(), :not())
      // The list includes both "has" and "has()" variants
      if (pseudoClassName) {
        const withParens = `${pseudoClassName}()`;
        if (
          (pseudoClasses as readonly string[]).includes(pseudoClassName) ||
          (pseudoClasses as readonly string[]).includes(withParens)
        ) {
          return { success: true, type: "pseudo-class" };
        }
      }

      // Invalid pseudo-class name
      return {
        success: false,
        error: "Invalid pseudo-class",
      };
    }

    if (foundAttribute) {
      return { success: true, type: "attribute" };
    }

    // If we get here, something unexpected happened
    return {
      success: false,
      error: "Invalid CSS selector syntax",
    };
  } catch {
    return {
      success: false,
      error: "Invalid CSS selector syntax",
    };
  }
};
