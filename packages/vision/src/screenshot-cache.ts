import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
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
      return await stat(screenshotPath)
        .then(({ size }) => size > 0)
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
    [...paths].map(async ([id, screenshotPath]) => {
      const destination = getCachedScreenshotPath(directory, id);
      const temporary = `${destination}.${randomUUID()}.tmp`;
      try {
        await copyFile(screenshotPath, temporary);
        await rename(temporary, destination);
      } finally {
        await rm(temporary, { force: true });
      }
    })
  );
};
