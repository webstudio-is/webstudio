import { getFilenameAndExtension } from "../array-buffer-helpers";

describe("Breakpoints sorting for visual rendering", () => {
  test("sort initial breakpoints", () => {
    expect(getFilenameAndExtension("index.js")).toStrictEqual(["index", "js"]);
  });
});
