import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, expect, test } from "vitest";
import { build } from "vite";

const packageRoot = join(import.meta.dirname, "..");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

test("reads the SSG asset resource fetch template from the bundled CLI package", async () => {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "webstudio-ssg-template-")
  );
  temporaryDirectories.push(temporaryDirectory);
  const outputDirectory = join(temporaryDirectory, "package", "lib");
  const templatePath = join(
    "templates",
    "ssg",
    "app",
    "asset-resource-fetch.ts"
  );
  await mkdir(dirname(join(temporaryDirectory, "package", templatePath)), {
    recursive: true,
  });
  await cp(
    join(packageRoot, templatePath),
    join(temporaryDirectory, "package", templatePath)
  );

  await build({
    configFile: false,
    logLevel: "silent",
    build: {
      target: "node22",
      outDir: outputDirectory,
      emptyOutDir: false,
      lib: {
        entry: join(packageRoot, "src", "ssg-asset-resource-fetch-template.ts"),
        formats: ["es"],
        fileName: "template-reader",
      },
      rollupOptions: {
        external: ["node:fs/promises"],
      },
    },
  });

  const bundledModule = (await import(
    `${pathToFileURL(join(outputDirectory, "template-reader.js"))}?test=${crypto.randomUUID()}`
  )) as {
    readSsgAssetResourceFetchTemplate: () => Promise<string>;
  };
  const expectedTemplate = await readFile(
    join(packageRoot, templatePath),
    "utf8"
  );

  await expect(bundledModule.readSsgAssetResourceFetchTemplate()).resolves.toBe(
    expectedTemplate
  );
});
