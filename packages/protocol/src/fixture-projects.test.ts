import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { bundleVersion, publishedProjectBundle } from "./schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixturesRoot = join(root, "fixtures");

const assetDirectories = [
  ".webstudio/assets",
  "public/assets",
  "build/client/assets",
  "dist/client/assets",
] as const;

const getFixtureDataFiles = () =>
  readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      fixtureName: entry.name,
      fixtureDirectory: join(fixturesRoot, entry.name),
      dataFile: join(fixturesRoot, entry.name, ".webstudio/data.json"),
    }))
    .filter(({ dataFile }) => existsSync(dataFile));

const readFixtureData = (dataFile: string) =>
  JSON.parse(readFileSync(dataFile, "utf8"));

const hasFixtureAssetFile = (fixtureDirectory: string, assetName: string) =>
  assetDirectories.some((directory) =>
    existsSync(join(fixtureDirectory, directory, assetName))
  );

describe("fixture project bundles", () => {
  const fixtureDataFiles = getFixtureDataFiles();

  test("keeps at least one project fixture covered", () => {
    expect(fixtureDataFiles.length).toBeGreaterThan(0);
  });

  test.each(fixtureDataFiles)(
    "$fixtureName has current bundle-compatible data",
    ({ dataFile }) => {
      const data = publishedProjectBundle.parse(readFixtureData(dataFile));

      expect(data.bundleVersion).toBe(bundleVersion);
    }
  );

  test.each(fixtureDataFiles)(
    "$fixtureName asset records point at fixture files",
    ({ dataFile, fixtureDirectory }) => {
      const data = publishedProjectBundle.parse(readFixtureData(dataFile));
      const missingAssetFiles = data.assets
        .map((asset) => asset.name)
        .filter(
          (assetName) =>
            hasFixtureAssetFile(fixtureDirectory, assetName) === false
        );

      expect(missingAssetFiles).toEqual([]);
    }
  );
});
