import * as csstree from "css-tree";

const colorCategories = [
  "background",
  "foreground",
  "border",
  "overlay",
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

const expectValues = (label: string, values: Record<string, string>) => {
  if (Object.keys(values).length === 0) {
    throw new Error(`${label} must define at least one value`);
  }
};

const expectSameNames = (
  label: string,
  first: Record<string, string>,
  second: Record<string, string>
) => {
  const firstNames = Object.keys(first).sort();
  const secondNames = Object.keys(second).sort();
  if (
    firstNames.length !== secondNames.length ||
    firstNames.some((name, index) => name !== secondNames[index])
  ) {
    throw new Error(
      `${label} must define the same values; received ${firstNames.join(", ")} and ${secondNames.join(", ")}`
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

const validateConsumed = ({
  label,
  declarations,
  consumers,
}: {
  label: string;
  declarations: Record<string, string>;
  consumers: Record<string, string>;
}) => {
  const consumed = new Set(
    Object.values(consumers).flatMap(getCssVariableReferences)
  );
  const unused = Object.keys(declarations).filter(
    (name) => consumed.has(name) === false
  );
  if (unused.length > 0) {
    throw new Error(`Unused ${label}: ${unused.join(", ")}`);
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
    ':root[data-color-scheme="dark"]'
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

  expectValues("Color seeds", seed);
  expectValues("Light color profile", lightProfile);
  expectValues("Dark color profile", darkProfile);
  expectValues("Theme colors", theme);
  for (const [category, colors] of Object.entries(semantic)) {
    expectValues(`${category} semantic colors`, colors);
  }
  expectSameNames("Light and dark color profiles", lightProfile, darkProfile);

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
  const uncategorized = Object.keys(lightDeclarations).filter(
    (name) => names.has(name) === false
  );
  if (uncategorized.length > 0) {
    throw new Error(
      `Uncategorized color variables: ${uncategorized.join(", ")}`
    );
  }
  const darkNonProfile = Object.keys(darkDeclarations).filter(
    (name) => name.startsWith("--profile-") === false
  );
  if (darkNonProfile.length > 0) {
    throw new Error(
      `Dark mode may override only profile variables: ${darkNonProfile.join(", ")}`
    );
  }

  const seedDeclarations = Object.fromEntries(
    Object.entries(seed).map(([name, value]) => [`--seed-${name}`, value])
  );
  const profileDeclarations = Object.fromEntries(
    Object.entries(lightProfile).map(([name, value]) => [
      `--profile-${name}`,
      value,
    ])
  );
  const themeDeclarations = Object.fromEntries(
    Object.entries(theme).map(([name, value]) => [`--theme-${name}`, value])
  );

  validateReferences({
    declarations: themeDeclarations,
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
  validateConsumed({
    label: "color seeds",
    declarations: seedDeclarations,
    consumers: themeDeclarations,
  });
  validateConsumed({
    label: "light profile values",
    declarations: profileDeclarations,
    consumers: themeDeclarations,
  });
  validateConsumed({
    label: "theme colors",
    declarations: themeDeclarations,
    consumers: semanticDeclarations,
  });
  validateCycles(allDeclarations);

  return {
    seed,
    profile: { light: lightProfile, dark: darkProfile },
    theme,
    semantic,
  };
};
