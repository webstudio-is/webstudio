import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const workspaceRoots = ["apps", "packages"];
const runtimeDependencyFields = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const findWorkspacePackageJsons = async () => {
  const packageJsons = [];
  for (const root of workspaceRoots) {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        packageJsons.push(join(root, entry.name, "package.json"));
      }
    }
  }
  return packageJsons;
};

const packages = await Promise.all(
  (await findWorkspacePackageJsons()).map(async (path) => ({
    path,
    manifest: await readJson(path),
  }))
);

const workspacePackageByName = new Map(
  packages.map((pkg) => [pkg.manifest.name, pkg])
);

const violations = [];

for (const pkg of packages) {
  if (pkg.manifest.private === true) {
    continue;
  }
  for (const field of runtimeDependencyFields) {
    for (const dependencyName of Object.keys(pkg.manifest[field] ?? {})) {
      const dependency = workspacePackageByName.get(dependencyName);
      if (dependency?.manifest.private === true) {
        violations.push(
          `${pkg.manifest.name} (${pkg.path}) lists private workspace package ` +
            `${dependencyName} in ${field}. Use devDependencies for build-time ` +
            `generation or move the shared runtime contract to a public package.`
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Package boundary violations found:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.info("Package boundaries are valid.");
