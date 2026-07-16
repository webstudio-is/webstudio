import * as csstree from "css-tree";
import { pseudoElements } from "./__generated__/pseudo-elements";
import { pseudoClasses } from "./__generated__/pseudo-classes";

export type SelectorValidationResult =
  | { success: false; error: string }
  | { success: true; type: "pseudo-class" | "pseudo-element" | "attribute" };

/**
 * Validates an open CSS state suffix scoped to the current element.
 *
 * Builder states are not a closed component-state enum. Valid pseudo-classes,
 * pseudo-elements, and attribute selectors may be compounded, but selector
 * lists, type/class/id selectors, and combinators are rejected because the CSS
 * engine appends this value directly to the generated instance selector.
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
    const ast = csstree.parse(selector, { context: "selectorList" });
    if (ast.type !== "SelectorList" || ast.children.size !== 1) {
      return {
        success: false,
        error: "Selector must be one state scoped to the current element",
      };
    }
    const parsedSelector = ast.children.first;
    if (
      parsedSelector?.type !== "Selector" ||
      parsedSelector.children
        .toArray()
        .some(
          (node) =>
            node.type !== "PseudoClassSelector" &&
            node.type !== "PseudoElementSelector" &&
            node.type !== "AttributeSelector"
        )
    ) {
      return {
        success: false,
        error:
          "Selector must be a pseudo-class, pseudo-element, or attribute suffix scoped to the current element",
      };
    }

    const pseudoClassNames: string[] = [];
    const pseudoElementNames: string[] = [];
    let foundAttribute = false;

    // Walk the AST to find pseudo-class, pseudo-element, or attribute selectors
    csstree.walk(ast, (node) => {
      if (node.type === "PseudoClassSelector") {
        pseudoClassNames.push(node.name);
      }
      if (node.type === "PseudoElementSelector") {
        pseudoElementNames.push(node.name);
      }
      if (node.type === "AttributeSelector") {
        foundAttribute = true;
      }
    });

    // Determine the type based on what we found
    const isKnownSelector = (name: string, known: readonly string[]) =>
      known.includes(name) || known.includes(`${name}()`);
    if (
      pseudoElementNames.some(
        (name) => isKnownSelector(name, pseudoElements) === false
      )
    ) {
      return { success: false, error: "Invalid pseudo-element" };
    }
    const invalidPseudoClass = pseudoClassNames.find(
      (name) =>
        isKnownSelector(name, pseudoClasses) === false &&
        isKnownSelector(name, pseudoElements) === false
    );
    if (invalidPseudoClass !== undefined) {
      return { success: false, error: "Invalid pseudo-class" };
    }

    if (pseudoElementNames.length > 0) {
      // Validate that the pseudo-element actually exists
      // Some pseudo-elements are functional (e.g., ::part(), ::slotted())
      // The list includes both "part" and "part()" variants
      return { success: true, type: "pseudo-element" };
    }

    if (pseudoClassNames.length > 0) {
      // Check if it's actually a legacy pseudo-element (single colon)
      // Legacy syntax: :before, :after, :first-line, :first-letter
      if (
        pseudoClassNames.every((name) => isKnownSelector(name, pseudoElements))
      ) {
        return { success: true, type: "pseudo-element" };
      }
      return { success: true, type: "pseudo-class" };
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
