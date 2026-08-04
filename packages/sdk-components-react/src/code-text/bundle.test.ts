import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const getBundleInputs = async (contents: string) => {
  const result = await build({
    stdin: {
      contents,
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
  return Object.keys(result.metafile?.inputs ?? {});
};

test("bundles only directly selected Shiki assets", async () => {
  const inputs = await getBundleInputs(`
        import javascript from "@shikijs/langs/javascript";
        import nord from "@shikijs/themes/nord";
        import { createCodeText } from "@webstudio-is/sdk-components-react/code-text";
        export const CodeText = createCodeText({
          languages: [javascript],
          themes: [nord],
        });
      `);

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
    inputs.some((path) => path.endsWith("@shikijs/langs/dist/index.mjs"))
  ).toBe(false);
  expect(
    inputs.some((path) => path.endsWith("@shikijs/themes/dist/dracula.mjs"))
  ).toBe(false);
  expect(inputs.some((path) => path.endsWith("shiki/dist/index.mjs"))).toBe(
    false
  );
});

test("keeps Shiki out of plain Code Text bundles", async () => {
  const inputs = await getBundleInputs(`
    import { CodeText } from "@webstudio-is/sdk-components-react/components";
    export const code = <CodeText code="plain" />;
  `);

  expect(inputs.filter((path) => path.includes("shiki"))).toEqual([]);
});

test("reads Code Text metadata without bundling Shiki loaders", async () => {
  const inputs = await getBundleInputs(`
    import { CodeText } from "@webstudio-is/sdk-components-react/metas";
    export const options = CodeText.props;
  `);

  expect(
    inputs.some((path) => path.includes("shiki/dist/langs-bundle-full"))
  ).toBe(false);
  expect(inputs.some((path) => path.includes("@shikijs/core"))).toBe(false);
  expect(
    inputs.filter(
      (path) =>
        path.includes("@shikijs/langs/dist/") &&
        path.endsWith("@shikijs/langs/dist/index.mjs") === false
    )
  ).toEqual([]);
});
