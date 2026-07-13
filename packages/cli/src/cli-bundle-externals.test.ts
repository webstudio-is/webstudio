import { describe, expect, test } from "vitest";
import { isExternal } from "../vite.config";
import packageJson from "../package.json";

describe("CLI bundle externals", () => {
  test("loads esbuild and Node builtins from the installed environment", () => {
    expect(isExternal("esbuild")).toBe(true);
    expect(isExternal("esbuild/lib/main.js")).toBe(true);
    expect(isExternal("node:fs")).toBe(true);
  });

  test("bundles the component registry without publishing its React dependency tree", () => {
    expect(isExternal("@webstudio-is/sdk-components-registry/framework")).toBe(
      false
    );
    expect(packageJson.dependencies).not.toHaveProperty(
      "@webstudio-is/sdk-components-registry"
    );
    expect(packageJson.devDependencies).toHaveProperty(
      "@webstudio-is/sdk-components-registry"
    );
  });
});
