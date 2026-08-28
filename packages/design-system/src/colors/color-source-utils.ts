import * as csstree from "css-tree";

const colorCategories = [
  "background",
  "foreground",
  "border",
  "overlay",
] as const;

type ColorCategory = (typeof colorCategories)[number];

export type ColorSource = {
  theme: {
    color: Record<string, string>;
    contrast: Record<string, string>;
  };
  scheme: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  derived: Record<string, string>;
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

  const themeColor = getGroup(lightDeclarations, "--theme-color-");
  const themeContrast = getGroup(lightDeclarations, "--theme-contrast-");
  const lightScheme = getGroup(lightDeclarations, "--scheme-");
  const darkScheme = getGroup(darkDeclarations, "--scheme-");
  const derived = getGroup(lightDeclarations, "--color-");
  const semantic = Object.fromEntries(
    colorCategories.map((category) => [
      category,
      getGroup(lightDeclarations, `--${category}-`),
    ])
  ) as ColorSource["semantic"];

  expectValues("Theme color parameters", themeColor);
  expectValues("Theme contrast parameters", themeContrast);
  expectValues("Light scheme bounds", lightScheme);
  expectValues("Dark scheme bounds", darkScheme);
  expectValues("Derived colors", derived);
  for (const [category, colors] of Object.entries(semantic)) {
    expectValues(`${category} semantic colors`, colors);
  }
  expectSameNames("Light and dark scheme bounds", lightScheme, darkScheme);

  const allDeclarations = {
    ...Object.fromEntries(
      Object.entries(themeColor).map(([name, value]) => [
        `--theme-color-${name}`,
        value,
      ])
    ),
    ...Object.fromEntries(
      Object.entries(themeContrast).map(([name, value]) => [
        `--theme-contrast-${name}`,
        value,
      ])
    ),
    ...Object.fromEntries(
      Object.entries(lightScheme).map(([name, value]) => [
        `--scheme-${name}`,
        value,
      ])
    ),
    ...Object.fromEntries(
      Object.entries(derived).map(([name, value]) => [`--color-${name}`, value])
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
  const darkNonScheme = Object.keys(darkDeclarations).filter(
    (name) => name.startsWith("--scheme-") === false
  );
  if (darkNonScheme.length > 0) {
    throw new Error(
      `Dark mode may override only scheme bounds: ${darkNonScheme.join(", ")}`
    );
  }

  const themeDeclarations = Object.fromEntries(
    Object.entries(themeColor)
      .map(([name, value]) => [`--theme-color-${name}`, value])
      .concat(
        Object.entries(themeContrast).map(([name, value]) => [
          `--theme-contrast-${name}`,
          value,
        ])
      )
  );
  const schemeDeclarations = Object.fromEntries(
    Object.entries(lightScheme).map(([name, value]) => [
      `--scheme-${name}`,
      value,
    ])
  );
  const darkSchemeDeclarations = Object.fromEntries(
    Object.entries(darkScheme).map(([name, value]) => [
      `--scheme-${name}`,
      value,
    ])
  );
  const derivedDeclarations = Object.fromEntries(
    Object.entries(derived).map(([name, value]) => [`--color-${name}`, value])
  );

  for (const declarations of [schemeDeclarations, darkSchemeDeclarations]) {
    validateReferences({
      declarations,
      names,
      allowedPrefixes: ["--theme-color-", "--theme-contrast-", "--scheme-"],
    });
  }

  validateReferences({
    declarations: derivedDeclarations,
    names,
    allowedPrefixes: [
      "--theme-color-",
      "--theme-contrast-",
      "--scheme-",
      "--color-",
    ],
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
      "--color-",
      "--background-",
      "--foreground-",
      "--border-",
      "--overlay-",
    ],
    requireReference: true,
  });
  validateCycles(allDeclarations);
  validateCycles({ ...allDeclarations, ...darkSchemeDeclarations });
  validateConsumed({
    label: "theme parameters",
    declarations: themeDeclarations,
    consumers: derivedDeclarations,
  });
  validateConsumed({
    label: "light scheme bounds",
    declarations: schemeDeclarations,
    consumers: derivedDeclarations,
  });
  validateConsumed({
    label: "derived colors",
    declarations: derivedDeclarations,
    consumers: { ...derivedDeclarations, ...semanticDeclarations },
  });
  return {
    theme: { color: themeColor, contrast: themeContrast },
    scheme: { light: lightScheme, dark: darkScheme },
    derived,
    semantic,
  };
};
