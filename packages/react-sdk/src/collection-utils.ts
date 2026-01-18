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
 * For arrays, keys are converted to numbers.
 */
export const getCollectionEntries = (
  data: unknown
): Array<[string | number, unknown]> => {
  if (data === null || data === undefined) {
    return [];
  }
  if (typeof data !== "object") {
    return [];
  }
  const entries = Object.entries(data);
  // Convert string indices to numbers for arrays
  if (Array.isArray(data)) {
    return entries.map(([key, value]) => [Number(key), value]);
  }
  return entries;
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
  return `Object.entries(
  // @ts-ignore
  ${dataExpression} ?? {}
).map(([_key, ${itemVariable}]: any) => {
  const ${keyVariable} = Array.isArray(${dataExpression}) ? Number(_key) : _key;
  return`;
};
