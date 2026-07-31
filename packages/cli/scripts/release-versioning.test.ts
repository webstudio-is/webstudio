import { access, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const releaseVersionPlaceholder = "0.0.0-webstudio-version";
const dependencyGroups = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const listPackageFiles = async (parent: string) => {
  const directories = await readdir(join(workspaceRoot, parent), {
    withFileTypes: true,
  });
  const candidates = directories
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(workspaceRoot, parent, entry.name, "package.json"));
  return (
    await Promise.all(
      candidates.map(async (path) => {
        try {
          await access(path);
          return path;
        } catch {
          return;
        }
      })
    )
  ).filter((path) => path !== undefined);
};

test("keeps release placeholders out of workspace dependency protocols", async () => {
  const packageFiles = (
    await Promise.all(
      ["apps", "packages", "fixtures", "packages/cli/templates"].map(
        listPackageFiles
      )
    )
  ).flat();
  const invalidDependencies: string[] = [];

  for (const packageFile of packageFiles) {
    const manifest = JSON.parse(await readFile(packageFile, "utf8")) as Record<
      string,
      unknown
    >;
    for (const group of dependencyGroups) {
      const dependencies = manifest[group];
      if (typeof dependencies !== "object" || dependencies === null) {
        continue;
      }
      for (const [name, specifier] of Object.entries(dependencies)) {
        if (
          typeof specifier === "string" &&
          specifier.startsWith("workspace:") &&
          specifier.includes(releaseVersionPlaceholder)
        ) {
          invalidDependencies.push(
            `${relative(workspaceRoot, packageFile)}: ${name}=${specifier}`
          );
        }
      }
    }
  }

  expect(invalidDependencies).toEqual([]);
});
