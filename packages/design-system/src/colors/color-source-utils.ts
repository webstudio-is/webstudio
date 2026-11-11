import * as csstree from "css-tree";

const rootSelector = ":root";
const darkRootSelector = ':root[data-color-scheme="dark"]';
const ownedSelectors = new Set([rootSelector, darkRootSelector]);

export type ColorMode = "light" | "dark";

type Declaration = { value: string; references: string[] };
type Declarations = Map<string, Declaration>;

export const getCssVariableReferences = (value: string) => {
  const references: string[] = [];
  csstree.walk(csstree.parse(value, { context: "value" }), {
    visit: "Function",
    enter(node) {
      if (node.type !== "Function" || node.name !== "var") {
        return;
      }
      const first = node.children.first;
      if (first?.type !== "Identifier" || !first.name.startsWith("--")) {
        throw new Error(`Invalid color variable reference in: ${value}`);
      }
      references.push(first.name);
    },
  });
  return references;
};

const validateGraph = (declarations: Declarations) => {
  for (const [name, { references }] of declarations) {
    for (const reference of references) {
      if (!declarations.has(reference)) {
        throw new Error(`${name} references missing variable ${reference}`);
      }
    }
  }

  const visited = new Set<string>();
  const visiting: string[] = [];
  const visit = (name: string) => {
    if (visited.has(name)) {
      return;
    }
    const cycleStart = visiting.indexOf(name);
    if (cycleStart !== -1) {
      throw new Error(
        `Circular color reference: ${[...visiting.slice(cycleStart), name].join(" -> ")}`
      );
    }
    visiting.push(name);
    for (const reference of declarations.get(name)?.references ?? []) {
      visit(reference);
    }
    visiting.pop();
    visited.add(name);
  };
  for (const name of declarations.keys()) {
    visit(name);
  }
};

const getGroup = (declarations: Declarations, prefix: string) =>
  Object.fromEntries(
    [...declarations]
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, { value }]) => [name.slice(prefix.length), value])
  );

export const parseColorSource = (css: string) => {
  const stylesheet = csstree.parse(css);
  if (stylesheet.type !== "StyleSheet") {
    throw new Error("Color source must be a stylesheet");
  }

  const topLevelRules = new Set<csstree.Rule>();
  stylesheet.children.forEach((node) => {
    if (node.type === "Rule") {
      topLevelRules.add(node);
    }
  });

  const roots = new Map<string, Declarations>();
  csstree.walk(stylesheet, {
    visit: "Rule",
    enter(rule) {
      if (rule.type !== "Rule") {
        return;
      }
      const selector = csstree.generate(rule.prelude);
      const isTopLevel = topLevelRules.has(rule);
      const isOwned = ownedSelectors.has(selector);
      if (isTopLevel && isOwned && roots.has(selector)) {
        throw new Error(`Duplicate color selector: ${selector}`);
      }
      const declarations: Declarations = new Map();
      rule.block.children.forEach((node) => {
        if (node.type !== "Declaration" || !node.property.startsWith("--")) {
          return;
        }
        if (!isTopLevel) {
          throw new Error(
            "Color variables may be declared only in top-level root selectors"
          );
        }
        if (!isOwned) {
          throw new Error(`Color variables may not be declared in ${selector}`);
        }
        if (declarations.has(node.property)) {
          throw new Error(`Duplicate color declaration: ${node.property}`);
        }
        const value = csstree.generate(node.value).trim();
        declarations.set(node.property, {
          value,
          references: getCssVariableReferences(value),
        });
      });
      if (isTopLevel && isOwned) {
        roots.set(selector, declarations);
      }
    },
  });

  const light = roots.get(rootSelector);
  const dark = roots.get(darkRootSelector);
  if (light === undefined) {
    throw new Error(`Missing color selector: ${rootSelector}`);
  }
  if (dark === undefined) {
    throw new Error(`Missing color selector: ${darkRootSelector}`);
  }
  validateGraph(light);
  validateGraph(new Map([...light, ...dark]));

  return {
    theme: {
      color: getGroup(light, "--theme-color-"),
      contrast: getGroup(light, "--theme-contrast-"),
    },
    scheme: {
      light: getGroup(light, "--scheme-"),
      dark: getGroup(dark, "--scheme-"),
    },
    derived: getGroup(light, "--color-"),
    semantic: {
      background: getGroup(light, "--background-"),
      foreground: getGroup(light, "--foreground-"),
      border: getGroup(light, "--border-"),
      overlay: getGroup(light, "--overlay-"),
    },
  };
};
