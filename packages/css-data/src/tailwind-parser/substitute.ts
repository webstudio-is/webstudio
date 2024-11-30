import * as csstree from "css-tree";
import warnOnce from "warn-once";

type Warn = (condition: boolean, message: string) => void;

/**
 * Resolves CSS variables by replacing their references with actual values.
 * Transforms `.class { --property: 1px; margin: var(--property); }` into `.class { margin: 1px; }`.
 **/
export const substituteVariables = (
  css: string,
  warn: Warn = warnOnce
): string => {
  const ast = csstree.parse(css);

  // Cleanup
  csstree.walk(ast, {
    enter(node, item, list) {
      // @todo media queries support (needs specificity calculations)
      if (node.type === "Atrule") {
        list.remove(item);
        return;
      }

      // @todo pseudo class selectors support (needs specificity calculations)
      if (node.type === "Rule") {
        if (
          csstree.find(
            node,
            (childNode) => childNode.type === "PseudoClassSelector"
          )
        ) {
          list.remove(item);
          return;
        }
      }

      // Remove selectors not startings with * or .
      if (node.type === "Rule") {
        const selectors = csstree.generate(node.prelude);
        if (
          selectors.startsWith("*") === false &&
          selectors.startsWith(".") === false
        ) {
          list.remove(item);
          return;
        }

        // Try find pseudo class selectors
      }
    },
  });

  const rawProperties: Record<string, string> = {};

  // Extract all variables and remove them
  // As of now it doesn't work with :hover etc selectors, same with media queries
  csstree.walk(ast, {
    enter: (node, item, list) => {
      if (node.type === "Declaration" && node.property.startsWith("--")) {
        const propertyName = node.property.trim();
        const propertValue = csstree.generate(node.value);
        rawProperties[propertyName] = propertValue;
        list.remove(item);
      }
    },
  });

  /**
   * Iteratively resolve CSS variables within custom properties.
   * Custom properties treat variables as strings, making direct resolution impossible.
   * We perform multiple iterations to substitute these variables with their actual values.
   *
   * Example:
   * Initial: .class { --var: var(--margin-y) var(--margin-x); margin: var(--var); }
   * Iteration 1: .class { margin: var(--margin-y) var(--margin-x); }
   * Iteration 2: .class { margin: 1px 2px; }
   */
  const MAX_NESTED_DEPENDENCIES_DEPTH = 5;
  for (let depth = 0; depth !== MAX_NESTED_DEPENDENCIES_DEPTH; ++depth) {
    csstree.walk(ast, {
      enter: (node, item, list) => {
        if (node.type === "Function") {
          const functionName = node.name;
          if (functionName !== "var") {
            return;
          }

          const firstArgument = node.children.first;

          if (firstArgument === null) {
            throw new Error("Should never happen");
          }

          const propertyName = csstree.generate(firstArgument).trim();
          const propertyValue = rawProperties[propertyName];
          const fallbackArg =
            node.children.last === node.children.first
              ? null
              : node.children.last;

          const fallback =
            fallbackArg !== null ? csstree.generate(fallbackArg).trim() : null;

          if (propertyValue) {
            const astVariable = csstree.parse(propertyValue, {
              context: "value",
            });

            if ("children" in astVariable && astVariable.children !== null) {
              list.replace(item, astVariable.children);
              return;
            }
          }

          if (fallback) {
            const astVariable = csstree.parse(fallback, {
              context: "value",
            });

            if ("children" in astVariable && astVariable.children !== null) {
              list.replace(item, astVariable.children);
              return;
            }
          }
        }
      },
    });
  }

  let lastKnownRule: csstree.Rule | undefined = undefined;

  csstree.walk(ast, {
    enter: (node, item, list) => {
      if (node.type === "Rule") {
        lastKnownRule = node;
      }

      if (node.type === "Declaration") {
        const varNode = csstree.find(
          node,
          (childNode) =>
            childNode.type === "Function" && childNode.name === "var"
        );

        if (varNode === null) {
          return;
        }

        warn(
          true,
          `Variable ${csstree.generate(
            varNode
          )} cannot be resolved for property "${csstree.generate(
            node
          )}" in selector "${
            lastKnownRule !== undefined
              ? csstree.generate(lastKnownRule.prelude)
              : "unknown"
          }"`
        );

        list.remove(item);
      }
    },
  });

  // Cleanup empty rules
  csstree.walk(ast, {
    enter: (node, item, list) => {
      if (node.type === "Rule") {
        if (node.block.children.isEmpty) {
          list.remove(item);
        }
      }
    },
  });

  return csstree.generate(ast);
};
