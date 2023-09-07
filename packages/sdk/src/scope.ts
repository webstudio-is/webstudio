export type Scope = {
  /**
   * Accepts unique id to identify specific variable
   * and preferred name to use it as variable name
   * or suffix if already used.
   */
  getName(id: string, preferredName: string): string;
};

/**
 * Utility to maintain unique variable when generate code.
 * Single scope is shared for generated module for simplicity.
 *
 * occupiedIdentifiers parameter prevents collision with hardcoded
 * identifiers.
 */
export const createScope = (occupiedIdentifiers: string[] = []): Scope => {
  const freeIndexByPreferredName = new Map<string, number>();
  const scopedNameByIdMap = new Map<string, string>();
  for (const identifier of occupiedIdentifiers) {
    freeIndexByPreferredName.set(identifier, 1);
  }

  const getName = (id: string, preferredName: string) => {
    const cachedName = scopedNameByIdMap.get(id);
    if (cachedName !== undefined) {
      return cachedName;
    }
    const index = freeIndexByPreferredName.get(preferredName);
    freeIndexByPreferredName.set(preferredName, (index ?? 0) + 1);
    let scopedName = preferredName;
    if (index !== undefined) {
      scopedName = `${preferredName}_${index}`;
    }
    scopedNameByIdMap.set(id, scopedName);
    return scopedName;
  };

  return {
    getName,
  };
};
