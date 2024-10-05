import reservedIdentifiers from "reserved-identifiers";

const identifiers = reservedIdentifiers({ includeGlobalProperties: true });
const isReserved = (identifier: string) => identifiers.has(identifier);

export type Scope = {
  /**
   * Accepts unique id to identify specific variable
   * and preferred name to use it as variable name
   * or suffix if already used.
   */
  getName(id: string, preferredName: string): string;
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
const normalizeJsName = (name: string) => {
  // only letters, digits, underscores and dollar signs allowed in names
  // delete everything else
  name = name.replaceAll(/[^\w$]/g, "");
  // put at least single underscore in name to avoid syntax error
  if (name.length === 0) {
    return "_";
  }
  // variable name can start with letter, underscore and dollar signs
  if (/[A-Za-z_$]/.test(name[0]) === false) {
    name = `_${name}`;
  }

  if (isReserved(name)) {
    return `${name}_`;
  }

  return name;
};

/**
 * Utility to maintain unique variable when generate code.
 * Single scope is shared for generated module for simplicity.
 *
 * occupiedIdentifiers parameter prevents collision with hardcoded
 * identifiers.
 */
export const createScope = (
  occupiedIdentifiers: string[] = [],
  normalizeName = normalizeJsName,
  separator = "_"
): Scope => {
  const nameById = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const identifier of occupiedIdentifiers) {
    usedNames.add(identifier);
  }

  const getName = (id: string, preferredName: string) => {
    const cachedName = nameById.get(id);
    if (cachedName !== undefined) {
      return cachedName;
    }
    preferredName = normalizeName(preferredName);
    let index = 0;
    let scopedName = preferredName;
    while (usedNames.has(scopedName)) {
      index += 1;
      scopedName = `${preferredName}${separator}${index}`;
    }
    nameById.set(id, scopedName);
    usedNames.add(scopedName);
    return scopedName;
  };

  return {
    getName,
  };
};
