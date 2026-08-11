import { createHash } from "node:crypto";
import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runtimeFiles = [
  ".storybook/preview.tsx",
  ".storybook/story-settings.ts",
  ".storybook/story-sources.json",
  "pnpm-lock.yaml",
] as const;

const runtimeDirectories = [
  "packages/vision/src",
  "scripts/visual-regression",
] as const;

const isRuntimeFile = (file: string) => {
  const name = path.basename(file);
  return (
    name.includes(".test.") === false &&
    name.includes(".test-utils.") === false &&
    name.endsWith(".d.ts") === false &&
    name.endsWith(".md") === false &&
    name !== "tsconfig.json" &&
    file.includes(`${path.sep}__snapshots__${path.sep}`) === false
  );
};

export const getScreenshotRuntimeHash = async ({
  root,
  browserVersion,
}: {
  root: string;
  browserVersion: string;
}) => {
  const files: string[] = [...runtimeFiles];
  for (const directory of runtimeDirectories) {
    for await (const entry of glob(`${directory}/**/*`, {
      cwd: root,
      withFileTypes: true,
    })) {
      const file = path.relative(root, path.join(entry.parentPath, entry.name));
      if (entry.isFile() && isRuntimeFile(file)) {
        files.push(file);
      }
    }
  }
  files.sort();
  const runtimeHash = createHash("sha256");
  for (const file of files) {
    const contents = await readFile(path.join(root, file));
    runtimeHash.update(file);
    runtimeHash.update("\0");
    runtimeHash.update(createHash("sha256").update(contents).digest());
  }
  runtimeHash.update("browser\0");
  runtimeHash.update(browserVersion);
  return runtimeHash.digest("hex").slice(0, 12);
};

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(entrypoint)).href
) {
  const browserVersion = process.argv[2];
  if (browserVersion === undefined) {
    throw new Error("Usage: runtime-hash.ts <browser-version>");
  }
  console.info(
    await getScreenshotRuntimeHash({ root: process.cwd(), browserVersion })
  );
}
