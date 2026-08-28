export const toKebabCase = (name: string) =>
  name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);

export const toCssColorTokenRecord = <Value>(tokens: Record<string, Value>) =>
  Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [toKebabCase(name), value])
  ) as Record<string, Value>;
