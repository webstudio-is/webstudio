import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const fontAssetFixtureFiles = [
  {
    name: "rajdhani-latin-600-normal.woff2",
    format: "woff2" as const,
    bytes: [119, 79, 70, 50],
  },
  {
    name: "Rajdhani-SemiBold.ttf",
    format: "ttf" as const,
    bytes: [0, 1, 0, 0],
  },
] as const;

export const fontAssetFixtureMeta = {
  family: "Rajdhani",
  style: "normal",
  weight: 600,
} as const;

export const fontAssetFixtureUploadMeta = {
  family: "Imported Rajdhani",
  style: "normal",
  weight: 400,
} as const;

export const fontAssetFixtureSource =
  'url("/assets/rajdhani-latin-600-normal.woff2") format("woff2"), url("/assets/Rajdhani-SemiBold.ttf") format("truetype")';

export const writeFontAssetFixtureFiles = async (projectDirectory: string) => {
  const assetsDirectory = join(projectDirectory, ".webstudio/assets");
  await mkdir(assetsDirectory, { recursive: true });
  await Promise.all(
    fontAssetFixtureFiles.map(({ name, bytes }) =>
      writeFile(join(assetsDirectory, name), new Uint8Array(bytes))
    )
  );
};
