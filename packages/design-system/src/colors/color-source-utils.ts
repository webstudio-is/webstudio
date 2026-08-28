import * as csstree from "css-tree";
import Color from "colorjs.io";

const colorCategories = [
  "background",
  "foreground",
  "border",
  "overlay",
] as const;

const expectedSeedNames = [
  "neutral",
  "accent",
  "positive",
  "negative",
  "warning",
  "informative",
] as const;

const expectedProfileNames = [
  "background-lightness",
  "background-chroma",
  "foreground-lightness",
  "foreground-chroma",
  "intent-lightness",
  "intent-chroma",
] as const;

const expectedThemeNames = [
  "background",
  "foreground",
  "accent",
  "positive",
  "negative",
  "warning",
  "informative",
] as const;

type ColorCategory = (typeof colorCategories)[number];

export type ColorSource = {
  seed: Record<string, string>;
  profile: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  theme: Record<string, string>;
  semantic: Record<ColorCategory, Record<string, string>>;
};

export type ColorMode = "light" | "dark";

export type ColorContrastResult = {
  foreground: string;
  background: string;
  minimum: number;
  ratio: number;
};

const generateValue = (value: csstree.CssNode) =>
  csstree.generate(value).trim();

const getDeclarations = (rule: csstree.Rule) => {
  const declarations: Record<string, string> = {};
  rule.block.children.forEach((node) => {
    if (
      node.type !== "Declaration" ||
      node.property.startsWith("--") === false
    ) {
      return;
    }
    if (node.property in declarations) {
      throw new Error(`Duplicate color declaration: ${node.property}`);
    }
    declarations[node.property] = generateValue(node.value);
  });
  return declarations;
};

const selectDeclarations = (stylesheet: csstree.CssNode, selector: string) => {
  let declarations: Record<string, string> | undefined;
  csstree.walk(stylesheet, {
    visit: "Rule",
    enter(node) {
      if (node.type !== "Rule") {
        return;
      }
      if (csstree.generate(node.prelude) !== selector) {
        return;
      }
      if (declarations !== undefined) {
        throw new Error(`Duplicate color selector: ${selector}`);
      }
      declarations = getDeclarations(node);
    },
  });
  if (declarations === undefined) {
    throw new Error(`Missing color selector: ${selector}`);
  }
  return declarations;
};

const getGroup = (declarations: Record<string, string>, prefix: string) =>
  Object.fromEntries(
    Object.entries(declarations)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, value]) => [name.slice(prefix.length), value])
  );

const expectNames = (
  label: string,
  values: Record<string, string>,
  expectedNames: readonly string[]
) => {
  const names = Object.keys(values);
  if (
    names.length !== expectedNames.length ||
    names.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error(
      `${label} must define ${expectedNames.join(", ")} in that order; received ${names.join(", ")}`
    );
  }
};

export const getCssVariableReferences = (value: string) => {
  const references: string[] = [];
  const ast = csstree.parse(value, { context: "value" });
  csstree.walk(ast, {
    visit: "Function",
    enter(node) {
      if (node.type !== "Function") {
        return;
      }
      if (node.name !== "var") {
        return;
      }
      const first = node.children.first;
      if (
        first?.type !== "Identifier" ||
        first.name.startsWith("--") === false
      ) {
        throw new Error(`Invalid color variable reference in: ${value}`);
      }
      references.push(first.name);
    },
  });
  return references;
};

const validateReferences = ({
  declarations,
  names,
  allowedPrefixes,
  requireReference,
}: {
  declarations: Record<string, string>;
  names: ReadonlySet<string>;
  allowedPrefixes: readonly string[];
  requireReference?: boolean;
}) => {
  for (const [name, value] of Object.entries(declarations)) {
    const references = getCssVariableReferences(value);
    if (requireReference && references.length === 0) {
      throw new Error(`${name} must derive from another color variable`);
    }
    for (const reference of references) {
      if (
        allowedPrefixes.some((prefix) => reference.startsWith(prefix)) === false
      ) {
        throw new Error(`${name} cannot reference ${reference}`);
      }
      if (names.has(reference) === false) {
        throw new Error(`${name} references missing variable ${reference}`);
      }
    }
  }
};

const validateCycles = (declarations: Record<string, string>) => {
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
    for (const reference of getCssVariableReferences(declarations[name])) {
      if (reference in declarations) {
        visit(reference);
      }
    }
    visiting.pop();
    visited.add(name);
  };

  for (const name of Object.keys(declarations)) {
    visit(name);
  }
};

const validateSemanticName = (name: string) => {
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) === false) {
    throw new Error(`Invalid Craft semantic color name: ${name}`);
  }
};

export const parseColorSource = (css: string): ColorSource => {
  const stylesheet = csstree.parse(css, { positions: true });
  const lightDeclarations = selectDeclarations(stylesheet, ":root");
  const darkDeclarations = selectDeclarations(
    stylesheet,
    '[data-color-scheme="dark"]'
  );

  const seed = getGroup(lightDeclarations, "--seed-");
  const lightProfile = getGroup(lightDeclarations, "--profile-");
  const darkProfile = getGroup(darkDeclarations, "--profile-");
  const theme = getGroup(lightDeclarations, "--theme-");
  const semantic = Object.fromEntries(
    colorCategories.map((category) => [
      category,
      getGroup(lightDeclarations, `--${category}-`),
    ])
  ) as ColorSource["semantic"];

  expectNames("Color seeds", seed, expectedSeedNames);
  expectNames("Light color profile", lightProfile, expectedProfileNames);
  expectNames("Dark color profile", darkProfile, expectedProfileNames);
  expectNames("Theme colors", theme, expectedThemeNames);

  const allDeclarations = {
    ...Object.fromEntries(
      Object.entries(seed).map(([name, value]) => [`--seed-${name}`, value])
    ),
    ...Object.fromEntries(
      Object.entries(lightProfile).map(([name, value]) => [
        `--profile-${name}`,
        value,
      ])
    ),
    ...Object.fromEntries(
      Object.entries(theme).map(([name, value]) => [`--theme-${name}`, value])
    ),
    ...Object.fromEntries(
      Object.entries(semantic).flatMap(([category, values]) =>
        Object.entries(values).map(([name, value]) => [
          `--${category}-${name}`,
          value,
        ])
      )
    ),
  };
  const names = new Set(Object.keys(allDeclarations));

  validateReferences({
    declarations: Object.fromEntries(
      Object.entries(theme).map(([name, value]) => [`--theme-${name}`, value])
    ),
    names,
    allowedPrefixes: ["--seed-", "--profile-"],
    requireReference: true,
  });

  const semanticDeclarations = Object.fromEntries(
    Object.entries(semantic).flatMap(([category, values]) =>
      Object.entries(values).map(([name, value]) => [
        `--${category}-${name}`,
        value,
      ])
    )
  );
  for (const name of Object.keys(semanticDeclarations)) {
    validateSemanticName(name.slice(2));
  }
  validateReferences({
    declarations: semanticDeclarations,
    names,
    allowedPrefixes: [
      "--theme-",
      "--background-",
      "--foreground-",
      "--border-",
      "--overlay-",
    ],
    requireReference: true,
  });
  validateCycles(allDeclarations);

  return {
    seed,
    profile: { light: lightProfile, dark: darkProfile },
    theme,
    semantic,
  };
};

const toDeclarations = (source: ColorSource, mode: ColorMode) => ({
  ...Object.fromEntries(
    Object.entries(source.seed).map(([name, value]) => [
      `--seed-${name}`,
      value,
    ])
  ),
  ...Object.fromEntries(
    Object.entries(source.profile[mode]).map(([name, value]) => [
      `--profile-${name}`,
      value,
    ])
  ),
  ...Object.fromEntries(
    Object.entries(source.theme).map(([name, value]) => [
      `--theme-${name}`,
      value,
    ])
  ),
  ...Object.fromEntries(
    Object.entries(source.semantic).flatMap(([category, colors]) =>
      Object.entries(colors).map(([name, value]) => [
        `--${category}-${name}`,
        value,
      ])
    )
  ),
});

const getFunctionReference = (node: csstree.FunctionNode) => {
  if (node.name !== "var") {
    throw new Error(`Expected var(), received ${node.name}()`);
  }
  const first = node.children.first;
  if (first?.type !== "Identifier") {
    throw new Error("Invalid var() color reference");
  }
  return first.name;
};

export const resolveColorSource = (source: ColorSource, mode: ColorMode) => {
  const declarations = toDeclarations(source, mode);
  const resolved = new Map<string, Color>();

  const resolveNumericNode = (
    node: csstree.CssNode,
    origin?: Color
  ): number => {
    if (node.type === "Number") {
      return Number(node.value);
    }
    if (node.type === "Percentage") {
      return Number(node.value) / 100;
    }
    if (node.type === "Identifier" && origin !== undefined) {
      const [lightness, chroma, hue] = origin.oklch;
      if (node.name === "l") {
        return Number(lightness);
      }
      if (node.name === "c") {
        return Number(chroma);
      }
      if (node.name === "h") {
        return Number(hue);
      }
    }
    if (node.type === "Function" && node.name === "var") {
      const reference = getFunctionReference(node);
      const value = declarations[reference];
      if (value === undefined) {
        throw new Error(`Missing numeric color variable: ${reference}`);
      }
      const ast = csstree.parse(value, { context: "value" });
      if (ast.type !== "Value" || ast.children.size !== 1) {
        throw new Error(`Invalid numeric color variable: ${reference}`);
      }
      return resolveNumericNode(ast.children.first as csstree.CssNode);
    }
    if (node.type === "Function" && node.name === "calc") {
      const children = node.children.toArray();
      if (
        children.length !== 3 ||
        children[1].type !== "Operator" ||
        children[1].value !== "*"
      ) {
        throw new Error(
          `Unsupported color calculation: ${csstree.generate(node)}`
        );
      }
      return (
        resolveNumericNode(children[0], origin) *
        resolveNumericNode(children[2], origin)
      );
    }
    throw new Error(
      `Unsupported numeric color value: ${csstree.generate(node)}`
    );
  };

  const resolveColorNode = (node: csstree.CssNode): Color => {
    if (node.type !== "Function") {
      throw new Error(`Unsupported color value: ${csstree.generate(node)}`);
    }
    if (node.name === "var") {
      return resolveVariable(getFunctionReference(node));
    }
    if (node.name === "color-mix") {
      const children = node.children.toArray();
      if (
        children.length !== 7 ||
        children[0].type !== "Identifier" ||
        children[0].name !== "in" ||
        children[1].type !== "Identifier" ||
        children[1].name !== "oklch" ||
        children[4].type !== "Percentage"
      ) {
        throw new Error(`Unsupported color mix: ${csstree.generate(node)}`);
      }
      const first = resolveColorNode(children[3]);
      const second = resolveColorNode(children[6]);
      const secondWeight = 1 - Number(children[4].value) / 100;
      return Color.mix(first, second, secondWeight, { space: "oklch" });
    }
    if (node.name === "oklch") {
      const children = node.children.toArray();
      if (children[0]?.type !== "Identifier" || children[0].name !== "from") {
        return new Color(csstree.generate(node));
      }
      if (children[1]?.type !== "Function") {
        throw new Error(
          `Missing relative color origin: ${csstree.generate(node)}`
        );
      }
      const origin = resolveColorNode(children[1]);
      const lightness = resolveNumericNode(children[2], origin);
      const chroma = resolveNumericNode(children[3], origin);
      const hue = resolveNumericNode(children[4], origin);
      const alpha =
        children[5]?.type === "Operator" && children[5].value === "/"
          ? resolveNumericNode(children[6], origin)
          : origin.alpha;
      return new Color("oklch", [lightness, chroma, hue], alpha);
    }
    throw new Error(`Unsupported color function: ${node.name}()`);
  };

  const resolveVariable = (name: string): Color => {
    const cached = resolved.get(name);
    if (cached !== undefined) {
      return cached;
    }
    const value = declarations[name];
    if (value === undefined) {
      throw new Error(`Missing color variable: ${name}`);
    }
    const ast = csstree.parse(value, { context: "value" });
    if (ast.type !== "Value" || ast.children.size !== 1) {
      throw new Error(`Unsupported color declaration: ${name}`);
    }
    const color = resolveColorNode(ast.children.first as csstree.CssNode);
    resolved.set(name, color);
    return color;
  };

  return { resolveVariable };
};

const contrastContracts = [
  ["--foreground-primary", "--background-primary", 4.5],
  ["--foreground-secondary", "--background-primary", 4.5],
  ["--foreground-muted", "--background-primary", 4.5],
  ["--foreground-accent", "--background-primary", 4.5],
  ["--foreground-positive", "--background-primary", 4.5],
  ["--foreground-negative", "--background-primary", 4.5],
  ["--foreground-warning", "--background-primary", 4.5],
  ["--foreground-informative", "--background-primary", 4.5],
  ["--foreground-on-inverse", "--background-inverse", 4.5],
  ["--foreground-on-accent", "--background-accent", 4.5],
  ["--foreground-on-positive", "--background-positive", 4.5],
  ["--foreground-on-negative", "--background-negative", 4.5],
  ["--foreground-negative", "--background-negative-subtle", 4.5],
  ["--foreground-warning", "--background-warning-subtle", 4.5],
  ["--foreground-informative", "--background-informative-subtle", 4.5],
  ["--border-focus", "--background-primary", 3],
  ["--border-negative", "--background-primary", 3],
  ["--border-warning", "--background-primary", 3],
  ["--border-informative", "--background-primary", 3],
] as const;

export const getColorContrast = (
  source: ColorSource,
  mode: ColorMode
): ColorContrastResult[] => {
  const { resolveVariable } = resolveColorSource(source, mode);
  return contrastContracts.map(([foreground, background, minimum]) => ({
    foreground,
    background,
    minimum,
    ratio: resolveVariable(foreground).contrast(
      resolveVariable(background),
      "WCAG21"
    ),
  }));
};

export const validateColorContrast = (source: ColorSource) => {
  for (const mode of ["light", "dark"] as const) {
    for (const result of getColorContrast(source, mode)) {
      if (result.ratio < result.minimum) {
        throw new Error(
          `${mode} ${result.foreground} on ${result.background} has ${result.ratio.toFixed(2)}:1 contrast; expected at least ${result.minimum}:1`
        );
      }
    }
  }
};
