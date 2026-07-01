import { constants, createWriteStream } from "node:fs";
import { copyFile, rename, rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import pLimit from "p-limit";
import { getAssetUrl, type Asset } from "@webstudio-is/sdk";
import { createFolderIfNotExists, isFileExists } from "./fs-utils";
import { isAssetFileName } from "@webstudio-is/protocol";

export const LOCAL_ASSETS_DIR = ".webstudio/assets";

const limit = pLimit(10);

const runAssetTasks = async ({
  assets,
  continueOnError = false,
  operation,
  task,
}: {
  assets: Asset[];
  continueOnError?: boolean;
  operation: string;
  task: (asset: Asset) => Promise<void>;
}) => {
  await Promise.all(
    assets.map((asset) =>
      limit(async () => {
        try {
          await task(asset);
        } catch (error) {
          if (continueOnError) {
            console.error(`Error ${operation} file ${asset.name} \n ${error}`);
            return;
          }
          throw error;
        }
      })
    )
  );
};

export const getLocalAssetPath = (
  assetName: string,
  assetsDirectory = LOCAL_ASSETS_DIR
) => {
  if (isAssetFileName(assetName) === false) {
    throw new Error(`Asset path escapes ${assetsDirectory}: ${assetName}`);
  }
  const basePath = resolve(assetsDirectory);
  const assetPath = resolve(basePath, assetName);
  if (assetPath !== basePath && assetPath.startsWith(`${basePath}${sep}`)) {
    return assetPath;
  }
  throw new Error(`Asset path escapes ${assetsDirectory}: ${assetName}`);
};

export const createLocalAssetDataReader =
  (readFile: (path: string) => Promise<unknown>, assetsDirectory?: string) =>
  async (asset: { name: string }) =>
    (await readFile(
      getLocalAssetPath(asset.name, assetsDirectory)
    )) as ArrayBufferView<ArrayBuffer>;

const downloadUrlToFile = async (url: string, filePath: string) => {
  const tempFilePath = `${filePath}.tmp`;

  if (await isFileExists(filePath)) {
    return;
  }

  await createFolderIfNotExists(dirname(filePath));

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    if (response.body === null) {
      throw new Error(`Failed to fetch ${url}: response body is empty`);
    }

    const writableStream = createWriteStream(tempFilePath);
    await pipeline(
      response.body as unknown as NodeJS.ReadableStream,
      writableStream
    );

    await rename(tempFilePath, filePath);
  } catch (error) {
    await rm(tempFilePath, { force: true });
    throw error;
  }
};

export const downloadAssetFile = async ({
  asset,
  assetsDirectory = LOCAL_ASSETS_DIR,
  origin,
}: {
  asset: Asset;
  assetsDirectory?: string;
  origin: string;
}) => {
  await downloadUrlToFile(
    getAssetUrl(asset, origin).href,
    getLocalAssetPath(asset.name, assetsDirectory)
  );
};

export const downloadAssetFiles = async ({
  assets,
  assetsDirectory = LOCAL_ASSETS_DIR,
  continueOnError = false,
  origin,
}: {
  assets: Asset[];
  assetsDirectory?: string;
  continueOnError?: boolean;
  origin: string;
}) => {
  await runAssetTasks({
    assets,
    continueOnError,
    operation: "downloading",
    task: (asset) => downloadAssetFile({ asset, assetsDirectory, origin }),
  });
};

export const materializeAssetFile = async ({
  asset,
  origin,
  sourceAssetsDirectory = LOCAL_ASSETS_DIR,
  targetAssetsDirectory,
}: {
  asset: Asset;
  origin: string;
  sourceAssetsDirectory?: string;
  targetAssetsDirectory: string;
}) => {
  const targetPath = getLocalAssetPath(asset.name, targetAssetsDirectory);

  if (await isFileExists(targetPath)) {
    return;
  }

  await createFolderIfNotExists(dirname(targetPath));

  const sourcePath = getLocalAssetPath(asset.name, sourceAssetsDirectory);
  if (await isFileExists(sourcePath)) {
    try {
      await copyFile(sourcePath, targetPath, constants.COPYFILE_FICLONE);
    } catch {
      await copyFile(sourcePath, targetPath);
    }
    return;
  }

  await downloadAssetFile({
    asset,
    assetsDirectory: targetAssetsDirectory,
    origin,
  });
};

export const materializeAssetFiles = async ({
  assets,
  continueOnError = false,
  origin,
  sourceAssetsDirectory,
  targetAssetsDirectory,
}: {
  assets: Asset[];
  continueOnError?: boolean;
  origin: string;
  sourceAssetsDirectory?: string;
  targetAssetsDirectory: string;
}) => {
  await runAssetTasks({
    assets,
    continueOnError,
    operation: "materializing",
    task: (asset) =>
      materializeAssetFile({
        asset,
        origin,
        sourceAssetsDirectory,
        targetAssetsDirectory,
      }),
  });
};
