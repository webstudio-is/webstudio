#!/usr/bin/env tsx

import { rm, cp, access, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { totalist } from "totalist";
import { build, context, type BuildOptions } from "esbuild";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const noGeneratedAsEntries = args.includes("--no-generated-as-entries");

const entryPoints: string[] = [];
const assets: string[] = [];

await totalist("./src", (rel) => {
  if (rel.endsWith(".ts") || rel.endsWith(".tsx")) {
    if (
      rel.includes(".test.") ||
      rel.includes(".stories.") ||
      (noGeneratedAsEntries && rel.includes("__generated__/"))
    ) {
      return;
    }
    entryPoints.push(join("src", rel));
  }
  if (rel.endsWith(".json")) {
    assets.push(rel);
  }
});

await rm("lib", { recursive: true, force: true });
// regenerate them so we can safely write files into those directories without relying on esbuild creating them
// in the watch mode esbuild might not create them soon enough for them to be available for other parts of the script
await mkdir("lib");
await mkdir("lib/cjs");

const esmConfig: BuildOptions = {
  entryPoints,
  outdir: "lib",
  format: "esm",
};

const cjsConfig: BuildOptions = {
  entryPoints,
  outdir: "lib/cjs",
  format: "cjs",
};

if (watch) {
  const esmContext = await context(esmConfig);
  await esmContext.watch();
  const cjsContext = await context(cjsConfig);
  await cjsContext.watch();
} else {
  await build(esmConfig);
  await build(cjsConfig);
}

await writeFile(
  "lib/cjs/package.json",
  JSON.stringify({ type: "commonjs" }) + "\n",
  "utf8"
);

for (const rel of assets) {
  await cp(join("src", rel), join("lib", rel));
  await cp(join("src", rel), join("lib/cjs", rel));
}

if (noGeneratedAsEntries) {
  try {
    await access("./src/__generated__");
    await Promise.all([
      cp("./src/__generated__", "./lib/__generated__", { recursive: true }),
      cp("./src/__generated__", "./lib/cjs/__generated__", {
        recursive: true,
      }),
    ]);
  } catch {
    // noop
  }
}

if (watch) {
  console.info("watching...");
} else {
  console.info("build succeeded");
}
