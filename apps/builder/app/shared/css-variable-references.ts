import type { StyleValue } from "@webstudio-is/css-engine";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createCssVariableNameRegex = (name: string) =>
  new RegExp(`${escapeRegex(name)}(?![\\w-])`, "g");

export const createCssVariableNamesRegex = (names: Set<string>) => {
  if (names.size === 0) {
    return;
  }
  return new RegExp(
    `(?:${Array.from(names)
      .sort((left, right) => right.length - left.length)
      .map(escapeRegex)
      .join("|")})(?![\\w-])`,
    "g"
  );
};

export const collectCssVariableReferences = (value: string, regex?: RegExp) => {
  const references = new Set<string>();
  if (regex === undefined) {
    return references;
  }
  regex.lastIndex = 0;
  for (const match of value.matchAll(regex)) {
    references.add(match[0]);
  }
  return references;
};

export const rewriteCssVariableReferencesInStyleValue = (
  value: StyleValue,
  replacements: Record<string, string>
) => {
  let serialized = JSON.stringify(value);
  for (const [fromName, toName] of Object.entries(replacements)) {
    serialized = serialized.replace(
      new RegExp(`("value":")${escapeRegex(fromName.slice(2))}(?![\\w-])`, "g"),
      `$1${toName.slice(2)}`
    );
    serialized = serialized.replace(
      createCssVariableNameRegex(fromName),
      toName
    );
  }
  return JSON.parse(serialized) as StyleValue;
};

export const rewriteCssVariableReferencesInString = (
  value: string,
  replacements: Record<string, string>
) => {
  let nextValue = value;
  for (const [fromName, toName] of Object.entries(replacements)) {
    nextValue = nextValue.replace(createCssVariableNameRegex(fromName), toName);
  }
  return nextValue;
};
