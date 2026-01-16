/**
 * Shared collection iteration logic for both builder and published sites.
 *
 * Collections support both arrays and objects:
 * - Arrays: [item1, item2] -> entries are [["0", item1], ["1", item2]]
 * - Objects: {key1: val1, key2: val2} -> entries are [["key1", val1], ["key2", val2]]
 *
 * Using Object.entries() unifies both cases since arrays are objects with numeric keys.
 */

/**
 * Normalize collection data to entries format [key, value][].
 * Returns empty array if data is not iterable.
 */
export const getCollectionEntries = (
  data: unknown
): Array<[string, unknown]> => {
  if (data === null || data === undefined) {
    return [];
  }
  if (typeof data !== "object") {
    return [];
  }
  return Object.entries(data);
};

/**
 * Template for generated code that iterates over collections.
 * Used by component-generator.ts to ensure consistency.
 */
export const generateCollectionIterationCode = ({
  dataExpression,
  keyVariable,
  itemVariable,
}: {
  dataExpression: string;
  keyVariable: string;
  itemVariable: string;
}) => {
  return `Object.entries(${dataExpression} ?? {}).map(([${keyVariable}, ${itemVariable}]: any)`;
};
