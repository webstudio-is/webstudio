import { createHash } from "node:crypto";
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const getCachedScreenshotPath = (directory: string, id: string) =>
  path.join(directory, `${createHash("sha256").update(id).digest("hex")}.png`);

export const restoreScreenshotCache = async ({
  directory,
  ids,
  getOutputPath,
}: {
  directory: string;
  ids: readonly string[];
  getOutputPath: (id: string) => string;
}) => {
  const cachedPaths = ids.map(
    (id) => [id, getCachedScreenshotPath(directory, id)] as const
  );
  const available = await Promise.all(
    cachedPaths.map(async ([, screenshotPath]) => {
      return await access(screenshotPath)
        .then(() => true)
        .catch(() => false);
    })
  );
  if (available.every(Boolean) === false) {
    return;
  }
  return new Map(
    await Promise.all(
      cachedPaths.map(async ([id, screenshotPath]) => {
        const output = getOutputPath(id);
        await mkdir(path.dirname(output), { recursive: true });
        await copyFile(screenshotPath, output);
        return [id, output] as const;
      })
    )
  );
};

export const writeScreenshotCache = async ({
  directory,
  paths,
}: {
  directory: string;
  paths: ReadonlyMap<string, string>;
}) => {
  await mkdir(directory, { recursive: true });
  await Promise.all(
    [...paths].map(async ([id, screenshotPath]) =>
      copyFile(screenshotPath, getCachedScreenshotPath(directory, id))
    )
  );
};
