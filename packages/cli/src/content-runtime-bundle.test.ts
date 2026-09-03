import { build } from "esbuild";
import { expect, test } from "vitest";

test("keeps the MDX authoring parser out of the published content runtime", async () => {
  const result = await build({
    entryPoints: ["@webstudio-is/content-engine/runtime"],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    conditions: ["webstudio", "worker"],
    metafile: true,
    write: false,
  });
  const inputs = Object.keys(result.metafile.inputs);

  expect(inputs.some((path) => path.endsWith("/src/mdx.ts"))).toBe(false);
  expect(inputs.some((path) => path.includes("/node_modules/acorn/"))).toBe(
    false
  );
});
