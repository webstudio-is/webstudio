import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const getScreenshotPath = (directory: string, storyId: string) =>
  path.join(directory, `${storyId}.png`);

export const restoreScreenshotCache = async ({
  assetDirectory,
  directory,
  storyIds,
}: {
  assetDirectory: string;
  directory: string;
  storyIds: readonly string[];
}) => {
  const cachedPaths = storyIds.map(
    (storyId) => [storyId, getScreenshotPath(directory, storyId)] as const
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
      cachedPaths.map(async ([storyId, screenshotPath]) => {
        const output = path.join(assetDirectory, storyId, "baseline.png");
        await mkdir(path.dirname(output), { recursive: true });
        await copyFile(screenshotPath, output);
        return [storyId, output] as const;
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
    [...paths].map(async ([storyId, screenshotPath]) =>
      copyFile(screenshotPath, getScreenshotPath(directory, storyId))
    )
  );
};
