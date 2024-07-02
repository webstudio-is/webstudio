/* eslint-disable @typescript-eslint/ban-ts-comment */

/**
 * Simplified source of: https://github.com/immerjs/immer/blob/e2d222bd4fb26abded04075c936290715e9ee335/src/plugins/patches.ts#L214
 *
 * MIT License
 * Copyright (c) 2017 Michel Weststrate
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @typedef {Object} Patch
 * @property {"replace"|"remove"|"add"} op - The operation to perform.
 * @property {(string|number)[]} path - The path where the operation should be applied.
 * @property {*} [value] - The value to be used with the operation (optional).
 */

/**
 *
 * @param {unknown} thing
 * @returns
 */
const getArchtype = (thing) =>
  Array.isArray(thing)
    ? "Array"
    : thing instanceof Map
      ? "Map"
      : thing instanceof Set
        ? "Set"
        : "Object";

// @ts-ignore
const get = (thing, prop) =>
  getArchtype(thing) === "Map" ? thing.get(prop) : thing[prop];

/**
 * https://github.com/immerjs/immer/blob/e2d222bd4fb26abded04075c936290715e9ee335/src/plugins/patches.ts#L214
 * @template T
 * @param {T} draft - The draft object to apply patches to.
 * @param {ReadonlyArray<Patch>} patches
 * @returns {T} The patched draft object.
 */
const applyPatches = (draft, patches) => {
  patches.forEach((patch) => {
    const { path, op } = patch;

    let base = draft;
    for (let i = 0; i < path.length - 1; i++) {
      // @ts-ignore
      const parentType = getArchtype(base);
      let p = path[i];
      if (typeof p !== "string" && typeof p !== "number") {
        p = "" + p;
      }

      base = get(base, p);

      if (typeof base !== "object") {
        throw new Error("die");
      }
    }

    const type = getArchtype(base);
    const value = patch.value;

    const key = path[path.length - 1];
    switch (op) {
      case "replace":
        switch (type) {
          case "Map":
            // @ts-ignore
            return base.set(key, value);
          case "Set":
            throw new Error("set is not supported");
          default:
            // @ts-ignore
            return (base[key] = value);
        }
      case "add":
        switch (type) {
          case "Array":
            // @ts-ignore
            return key === "-" ? base.push(value) : base.splice(key, 0, value);
          case "Map":
            // @ts-ignore
            return base.set(key, value);
          case "Set":
            // @ts-ignore
            return base.add(value);
          default:
            // @ts-ignore
            return (base[key] = value);
        }
      case "remove":
        switch (type) {
          case "Array":
            // @ts-ignore
            return base.splice(key, 1);
          case "Map":
            // @ts-ignore
            return base.delete(key);
          case "Set":
            // @ts-ignore
            return base.delete(patch.value);
          default:
            // @ts-ignore
            return delete base[key];
        }
      default:
        throw new Error("invalid op");
    }
  });

  return draft;
};

/**
 *
 * @param {string} dataStr
 * @param {string} primaryKeyCommaSeparated - if empty then it's js array or plain object, otherwise is a map
 * @param {string} patchesStr
 * @returns {string}
 */
export const patch = (dataStr, primaryKeyCommaSeparated, patchesStr) => {
  /**
   * @param {*} item
   * @returns
   */

  const primaryKeyArray = primaryKeyCommaSeparated
    .split(",")
    .map((item) => item.trim());

  const isPlainObjectOrArray =
    primaryKeyArray.length === 1 && primaryKeyArray[0] === "";

  /**
   * @type { undefined | ((item: any) => string) }
   */
  let getKey = isPlainObjectOrArray
    ? undefined
    : (item) => {
        if (primaryKeyArray.length === 1) {
          return item[primaryKeyArray[0]];
        }

        return primaryKeyArray
          .map((key) => (item[key] == null ? "" : item[key]))
          .join(":");
      };

  let data = JSON.parse(dataStr);

  if (getKey !== undefined) {
    if (false === Array.isArray(data)) {
      throw new Error("Expected data as an array");
    }

    data = new Map(data.map((item) => [getKey(item), item]));
  }

  const patches = JSON.parse(patchesStr);

  const patched = applyPatches(data, patches);

  if (patched instanceof Map) {
    return JSON.stringify(Array.from(patched.values()));
  }

  return JSON.stringify(patched);
};

/**
 * This code is used inside a PostgreSQL function defined with PLV8.
 * It is wrapped with the following SQL command:
 *
 * CREATE OR REPLACE FUNCTION patch_map(data_str text, input_type text, patches_str text)
 * RETURNS text AS $$
 *
 * {{ CODE FROM THIS FILE }}
 *
 * const result = patch(data_str, input_type, patches_str);
 * return result;
 *
 * $$ LANGUAGE plv8 IMMUTABLE PARALLEL SAFE;
 */
