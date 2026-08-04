import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("bundles only directly selected Shiki assets", async () => {
  const result = await build({
    stdin: {
      contents: `
        import javascript from "@shikijs/langs/javascript";
        import nord from "@shikijs/themes/nord";
        import { createCodeText } from "@webstudio-is/sdk-components-react/code-text";
        export const CodeText = createCodeText({
          languages: [javascript],
          themes: [nord],
        });
      `,
      loader: "tsx",
      resolveDir: fileURLToPath(new URL(".", import.meta.url)),
    },
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "browser",
    conditions: ["webstudio"],
    external: ["react", "react/jsx-runtime"],
  });
  const inputs = Object.keys(result.metafile?.inputs ?? {});

  expect(
    inputs.some((path) => path.endsWith("@shikijs/langs/dist/javascript.mjs"))
  ).toBe(true);
  expect(
    inputs.some((path) => path.endsWith("@shikijs/themes/dist/nord.mjs"))
  ).toBe(true);
  expect(
    inputs.some((path) => path.endsWith("@shikijs/langs/dist/css.mjs"))
  ).toBe(false);
  expect(
    inputs.some((path) => path.endsWith("@shikijs/themes/dist/dracula.mjs"))
  ).toBe(false);
  expect(inputs.some((path) => path.endsWith("shiki/dist/index.mjs"))).toBe(
    false
  );
});
