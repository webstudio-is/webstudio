import { describe, expect, test } from "vitest";
import { isExternal } from "../vite.config";

describe("CLI bundle externals", () => {
  test("loads esbuild and Node builtins from the installed environment", () => {
    expect(isExternal("esbuild")).toBe(true);
    expect(isExternal("esbuild/lib/main.js")).toBe(true);
    expect(isExternal("node:fs")).toBe(true);
  });
});
