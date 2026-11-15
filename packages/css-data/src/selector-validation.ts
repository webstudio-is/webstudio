import * as csstree from "css-tree";
import { pseudoElements } from "./__generated__/pseudo-elements";
import { pseudoClasses } from "./__generated__/pseudo-classes";

export type SelectorValidationResult =
  | { success: false; error: string }
  | {
      success: true;
      type: "pseudo-class" | "pseudo-element" | "attribute";
      scopedState: string;
      descendant: string;
    }
  | {
      success: true;
      type: "tag";
      tag: string;
      condition: string;
      scopedState: string;
      descendant: string;
    };

/**
 * Validates an open CSS state suffix scoped to the current element.
 *
 * Builder states are not a closed component-state enum. Valid pseudo-classes,
 * pseudo-elements, and attribute selectors may be compounded. State selectors
 * can also target descendants or direct children. Selector lists, unanchored
 * selectors, and sibling combinators are rejected.
 * @param selector - The selector to validate (e.g., ":hover", "::before", "[data-state=open]")
 * @returns SelectorValidationResult with success status and type or error message
 */
export const validateSelector = (
  selector: string,
  { allowDescendants = true }: { allowDescendants?: boolean } = {}
): SelectorValidationResult => {
  if (!selector || selector.trim() === "") {
    return { success: false, error: "Selector cannot be empty" };
  }

  // A leading space marks a descendant tag selector. The CSS engine appends
  // state strings directly to the styled element's selector.
  const isTagSelector = selector.startsWith(" ");
  if (
    !isTagSelector &&
    !selector.startsWith(":") &&
    !selector.startsWith("[")
  ) {
    return {
      success: false,
      error:
        "Selector must start with a colon (:) for pseudo-classes, double colon (::) for pseudo-elements, or bracket ([) for attribute selectors",
    };
  }

  try {
    const ast = csstree.parse(selector, {
      context: "selectorList",
      positions: true,
    });
    if (ast.type !== "SelectorList" || ast.children.size !== 1) {
      return {
        success: false,
        error: "Selector must be one state scoped to the current element",
      };
    }
    const parsedSelector = ast.children.first;
    const selectorNodes =
      parsedSelector?.type === "Selector"
        ? parsedSelector.children.toArray()
        : [];
    const firstCombinatorIndex = selectorNodes.findIndex(
      (node) => node.type === "Combinator"
    );
    if (
      allowDescendants === false &&
      (isTagSelector || firstCombinatorIndex !== -1)
    ) {
      return {
        success: false,
        error: "Selector must be one state scoped to the current element",
      };
    }
    const stateNodes = selectorNodes.slice(
      0,
      firstCombinatorIndex === -1 ? undefined : firstCombinatorIndex
    );
    const hasValidTagStart =
      isTagSelector &&
      firstCombinatorIndex === -1 &&
      stateNodes[0]?.type === "TypeSelector" &&
      stateNodes
        .slice(1)
        .every(
          (node) =>
            node.type === "PseudoClassSelector" ||
            node.type === "PseudoElementSelector" ||
            node.type === "AttributeSelector"
        );
    if (
      parsedSelector?.type !== "Selector" ||
      stateNodes.length === 0 ||
      (!hasValidTagStart &&
        stateNodes.some(
          (node) =>
            node.type !== "PseudoClassSelector" &&
            node.type !== "PseudoElementSelector" &&
            node.type !== "AttributeSelector"
        )) ||
      (isTagSelector && !hasValidTagStart) ||
      selectorNodes.some(
        (node) =>
          node.type === "Combinator" && node.name !== " " && node.name !== ">"
      ) ||
      (firstCombinatorIndex !== -1 &&
        stateNodes.some((node) => node.type === "PseudoElementSelector"))
    ) {
      return {
        success: false,
        error:
          "Selector must be an element-scoped state, optionally followed by a descendant or child selector",
      };
    }

    const scopedStateEnd =
      stateNodes.at(-1)?.loc?.end.offset ?? selector.length;
    const parts = {
      scopedState: selector.slice(0, scopedStateEnd),
      descendant: selector.slice(scopedStateEnd),
    };

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

    if (
      isTagSelector &&
      stateNodes[0]?.type === "TypeSelector" &&
      pseudoElementNames.length === 0 &&
      pseudoClassNames.length > 0 &&
      pseudoClassNames.every((name) => isKnownSelector(name, pseudoElements))
    ) {
      // Keep the legacy single-colon pseudo-element classification.
      return { success: true, type: "pseudo-element", ...parts };
    }
    if (isTagSelector && stateNodes[0]?.type === "TypeSelector") {
      return {
        success: true,
        type: "tag",
        tag: stateNodes[0].name,
        condition: selector.slice(stateNodes[0].loc?.end.offset),
        ...parts,
      };
    }

    if (pseudoElementNames.length > 0) {
      // Validate that the pseudo-element actually exists
      // Some pseudo-elements are functional (e.g., ::part(), ::slotted())
      // The list includes both "part" and "part()" variants
      return { success: true, type: "pseudo-element", ...parts };
    }

    if (pseudoClassNames.length > 0) {
      // Check if it's actually a legacy pseudo-element (single colon)
      // Legacy syntax: :before, :after, :first-line, :first-letter
      if (
        pseudoClassNames.every((name) => isKnownSelector(name, pseudoElements))
      ) {
        return { success: true, type: "pseudo-element", ...parts };
      }
      return { success: true, type: "pseudo-class", ...parts };
    }

    if (foundAttribute) {
      return { success: true, type: "attribute", ...parts };
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
