export const toKebabCase = (name: string) =>
  name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);

export const toColorVariableName = (name: string) => `--${toKebabCase(name)}`;

export const toCompatibilityColorVariableName = (name: string) =>
  `--colors-${toKebabCase(name)}`;

export const toCssColorTokenRecord = <Value>(tokens: Record<string, Value>) =>
  Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [toKebabCase(name), value])
  ) as Record<string, Value>;

const semanticColorCategories = [
  "foreground",
  "background",
  "border",
  "overlay",
] as const;

type SemanticColorCategory = (typeof semanticColorCategories)[number];

export const toSemanticColorScales = <Value>(tokens: Record<string, Value>) => {
  const scales: Record<SemanticColorCategory, Record<string, Value>> = {
    foreground: {},
    background: {},
    border: {},
    overlay: {},
  };

  for (const [name, value] of Object.entries(tokens)) {
    const category = semanticColorCategories.find((candidate) =>
      name.startsWith(candidate)
    );
    if (category === undefined) {
      throw new Error(`Unknown semantic color category: ${name}`);
    }

    const role = name.slice(category.length);
    if (role === "") {
      throw new Error(`Semantic color is missing a role: ${name}`);
    }
    const roleName = `${role[0].toLowerCase()}${role.slice(1)}`;
    scales[category][toKebabCase(roleName)] = value;
  }

  return scales;
};
