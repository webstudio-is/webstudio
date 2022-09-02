import {
  getFilenameAndExtension,
  mergeUint8Arrays,
} from "./array-buffer-helpers";

describe("getFilenameAndExtension", () => {
  test("gets correct file name when only one dot", () => {
    expect(getFilenameAndExtension("index.js")).toEqual(["index", "js"]);
  });
  test("gets correct file name when more than one dot", () => {
    expect(getFilenameAndExtension("index.test.js")).toEqual([
      "index.test",
      "js",
    ]);
  });
});

describe("mergeUint8Arrays", () => {
  test("merges two array buffers", () => {
    const a = new Uint8Array([1]);
    const b = new Uint8Array([2]);
    expect(mergeUint8Arrays(a, b)).toStrictEqual(new Uint8Array([1, 2]));
  });
});
