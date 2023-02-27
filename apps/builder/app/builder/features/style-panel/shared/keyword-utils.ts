/**
 * Beautify a CSS keyword by capitalizing the first letter of each word,
 * and replacing dashes with spaces.
 */
export const toPascalCase = (keyword: string) => {
  const label = keyword
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");

  return label;
};

/**
 * Try to transform something from Pascal Case / Pascal Case / camelCase / camel Case to kebab-case
 */
export const toKebabCase = (keyword: string) => {
  const label = keyword
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return label;
};
