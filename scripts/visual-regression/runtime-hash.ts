import { createHash } from "node:crypto";
import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { visualRegressionConfig } from "./config";

export const getScreenshotRuntimeHash = async ({
  root,
  browserVersion,
}: {
  root: string;
  browserVersion: string;
}) => {
  const files: string[] = [];
  for await (const file of glob([...visualRegressionConfig.cache.include], {
    cwd: root,
  })) {
    if (
      visualRegressionConfig.cache.exclude.some((pattern) =>
        path.matchesGlob(file, pattern)
      ) === false
    ) {
      files.push(file);
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
