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
 *
 *
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

const get = (thing, prop) =>
  getArchtype(thing) === "Map" ? thing.get(prop) : thing[prop];

/**
 * https://github.com/immerjs/immer/blob/e2d222bd4fb26abded04075c936290715e9ee335/src/plugins/patches.ts#L214
 * @param {unknown} draft
 * @param {ReadonlyArray<Patch>} patches
 */
export const applyPatches = (draft, patches) => {
  patches.forEach((patch) => {
    const { path, op } = patch;

    let base = draft;
    for (let i = 0; i < path.length - 1; i++) {
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
            return base.set(key, value);
          case "Set":
            throw new Error("set is not supported");
          default:
            return (base[key] = value);
        }
      case "add":
        switch (type) {
          case "Array":
            return key === "-" ? base.push(value) : base.splice(key, 0, value);
          case "Map":
            return base.set(key, value);
          case "Set":
            return base.add(value);
          default:
            return (base[key] = value);
        }
      case "remove":
        switch (type) {
          case "Array":
            return base.splice(key, 1);
          case "Map":
            return base.delete(key);
          case "Set":
            return base.delete(patch.value);
          default:
            return delete base[key];
        }
      default:
        throw new Error("invalid op");
    }
  });

  return draft;
};
