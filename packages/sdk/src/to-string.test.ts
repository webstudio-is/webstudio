import { expect, test } from "vitest";
import { createJsonStringifyProxy } from "./to-string";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

test("recognizes an Email stringify proxy across independent SDK bundles", async () => {
  const bundle = async (entryPoint: string) => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(entryPoint, import.meta.url))],
      bundle: true,
      packages: "external",
      platform: "node",
      format: "cjs",
      write: false,
    });
    const module: { exports: Record<string, unknown> } = { exports: {} };
    new Function("module", "exports", "require", result.outputFiles[0].text)(
      module,
      module.exports,
      createRequire(import.meta.url)
    );
    return module.exports;
  };
  const emailBundle = await bundle("./email-resource.ts");
  const runtimeBundle = await bundle("./to-string.ts");
  const createFormEmailDataProxy = emailBundle.createFormEmailDataProxy as (
    value: object,
    options: { excludeKeys: string[] }
  ) => object;
  const isStringifyProxy = runtimeBundle.isStringifyProxy as (
    value: unknown
  ) => boolean;
  const createJsonStringifyProxy = runtimeBundle.createJsonStringifyProxy as (
    value: object
  ) => object;
  const formData = createFormEmailDataProxy(
    { name: "Ada", password: "secret" },
    { excludeKeys: ["password"] }
  );
  const evaluatorValue = isStringifyProxy(formData)
    ? formData
    : createJsonStringifyProxy(formData);

  expect(isStringifyProxy(formData)).toBe(true);
  expect(String(evaluatorValue)).toBe("Name: Ada");
});

test("preserves arrays when stringifying values with options", () => {
  const formData = createJsonStringifyProxy(
    { tags: ["blue", "green"] },
    { space: 2 }
  );

  expect(String(formData.tags)).toBe('[\n  "blue",\n  "green"\n]');
});

test("filters excluded keys while preserving nested JSON values", () => {
  const formData = createJsonStringifyProxy(
    { visible: { values: ["one", "two"], internal: "secret" } },
    { excludeKeys: ["internal"] }
  );

  expect(String(formData.visible)).toBe('{"values":["one","two"]}');
});
