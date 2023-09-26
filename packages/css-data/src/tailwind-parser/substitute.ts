import * as csstree from "css-tree";
import warnOnce from "warn-once";

/**
 * Substitute CSS variables with their values
 **/
export const substituteVariables = (css: string, warn = warnOnce) => {
  const ast = csstree.parse(css);

  // Cleanup
  csstree.walk(ast, {
    enter(node, item, list) {
      // Remove selectors not startings with * or .
      if (node.type === "Rule") {
        const selectors = csstree.generate(node.prelude);
        if (
          selectors.startsWith("*") === false &&
          selectors.startsWith(".") === false
        ) {
          list.remove(item);
        }
      }
    },
  });

  const variables: Record<string, string> = {};

  // Extract all variables and remove them
  csstree.walk(ast, {
    enter: (node, item, list) => {
      if (node.type === "Declaration" && node.property.startsWith("--")) {
        const propName = node.property.trim();
        const propValue = csstree.generate(node.value);
        variables[propName] = propValue;
        list.remove(item);
      }
    },
  });

  const MAX_NESTED_DEPENDENCIES_DEPTH = 5;
  for (let i = 0; i !== MAX_NESTED_DEPENDENCIES_DEPTH; ++i) {
    csstree.walk(ast, {
      enter: (node, item, list) => {
        if (node.type === "Function") {
          const funcName = node.name;

          if (funcName === "var") {
            const firstArg = node.children.first;
            if (firstArg === null) {
              return;
            }

            const varName = csstree.generate(firstArg).trim();
            const varValue = variables[varName];
            const fallbackArg =
              node.children.last === node.children.first
                ? null
                : node.children.last;

            const fallback =
              fallbackArg !== null
                ? csstree.generate(fallbackArg).trim()
                : null;

            if (varValue) {
              const astVariable = csstree.parse(varValue, {
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
        let hasVariables = false;
        csstree.walk(node.value, {
          enter: (childNode) => {
            if (childNode.type === "Function") {
              const funcName = childNode.name;

              if (funcName === "var") {
                warn(
                  true,
                  `Variable ${csstree.generate(
                    childNode
                  )} cannot be resolved be resolved for property "${csstree.generate(
                    node
                  )}" in selector "${
                    lastKnownRule !== undefined
                      ? csstree.generate(lastKnownRule.prelude)
                      : "unknown"
                  }"`
                );
                hasVariables = true;
              }
            }
          },
        });

        if (hasVariables) {
          // Remove declaration if it still contains variables
          list.remove(item);
        }
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
