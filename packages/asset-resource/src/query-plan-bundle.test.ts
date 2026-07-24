import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { build } from "esbuild";

describe("published asset query plan bundle", () => {
  test("stays compact and excludes authoring dependencies", async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL("./query-plan.ts", import.meta.url))],
      bundle: true,
      conditions: ["webstudio"],
      format: "esm",
      metafile: true,
      minify: true,
      platform: "browser",
      target: "es2022",
      treeShaking: true,
      write: false,
    });
    const bundle = result.outputFiles[0];
    const output = Object.values(result.metafile.outputs)[0];
    const contributedAuthoringDependencies = Object.entries(output.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([path]) => path)
      .filter((path) =>
        ["/graphql@", "/zod@", "/remark-", "/unified@", "/yaml@"].some(
          (dependency) => path.includes(dependency)
        )
      );

    expect(contributedAuthoringDependencies).toEqual([]);
    expect(bundle.contents.byteLength).toBeLessThanOrEqual(24 * 1024);
  });

  test("keeps the complete published runtime free of authoring dependencies", async () => {
    const result = await build({
      entryPoints: [
        fileURLToPath(new URL("./published-runtime.ts", import.meta.url)),
      ],
      bundle: true,
      conditions: ["webstudio"],
      format: "esm",
      metafile: true,
      minify: true,
      platform: "browser",
      target: "es2022",
      treeShaking: true,
      write: false,
    });
    const output = Object.values(result.metafile.outputs)[0];
    const authoringDependencies = Object.entries(output.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([path]) => path)
      .filter((path) =>
        ["/graphql@", "/zod@", "/remark-", "/unified@", "/yaml@"].some(
          (dependency) => path.includes(dependency)
        )
      );

    expect(authoringDependencies).toEqual([]);
    expect(result.outputFiles[0].contents.byteLength).toBeLessThanOrEqual(
      40 * 1024
    );
  });
});
