/* eslint-disable @typescript-eslint/no-var-requires */

import cp from "child_process";
import fs from "fs";
import fsP from "fs/promises";
import path from "path";
import { getDependentsGraph } from "@changesets/get-dependents-graph";
import { getPackages } from "@manypkg/get-packages";

type GetPackagesResult = Awaited<ReturnType<typeof getPackages>>;
type Package = GetPackagesResult["packages"][number];
type DependencyGraph = Map<string, Set<string>>;
type TsConfig = { references?: { path: string }[] };

const stringArrayEquals = (arrA: string[], arrB: string[]): boolean => {
  return (
    arrA.length === arrB.length && arrA.every((itemA, i) => itemA === arrB[i])
  );
};

const format = async (filePath: string, content: string): Promise<string> => {
  // lazy load prettier to avoid loading it when not needed
  const prettier = (await import("prettier")).default;
  const config = prettier.resolveConfig(filePath);
  return prettier.format(content, {
    ...config,
    filepath: filePath,
  });
};

const getDependencyGraph = (
  getPackagesResult: GetPackagesResult
): DependencyGraph => {
  const graph: DependencyGraph = new Map();

  for (const [dependency, dependents] of getDependentsGraph(
    getPackagesResult
  )) {
    for (const dependent of dependents) {
      let dependencies = graph.get(dependent);
      if (!dependencies) {
        dependencies = new Set();
        graph.set(dependent, dependencies);
      }
      dependencies.add(dependency);
    }
  }

  return graph;
};

const updateFile = async (filePath: string, content: string) => {
  await fsP.writeFile(filePath, await format(filePath, content));
  cp.spawnSync("git", ["add", filePath]);
};

const updateTsConfig = async (
  dependentDir: string,
  dependencies: Package[]
) => {
  const tsConfigPath = path.join(dependentDir, "tsconfig.json");
  const tsConfigContent = await fsP.readFile(tsConfigPath, "utf8");
  const tsConfig: TsConfig = JSON.parse(tsConfigContent);

  const dependencyPaths = [...dependencies.values()]
    .filter((dependency) =>
      fs.existsSync(path.join(dependency.dir, "tsconfig.json"))
    )
    .map((dependency) => path.relative(dependentDir, dependency.dir))
    .sort();

  if (
    stringArrayEquals(
      dependencyPaths,
      (tsConfig.references || []).map((reference) => reference.path)
    )
  ) {
    return;
  }

  await updateFile(
    tsConfigPath,
    JSON.stringify({
      ...tsConfig,
      references: dependencyPaths.map((path) => ({ path })),
    })
  );
};

(async () => {
  const rootDir = path.join(__dirname, "..");
  const getPackagesResult = await getPackages(rootDir);
  const indexedPackages = new Map(
    getPackagesResult.packages.map((pkg) => [pkg.packageJson.name, pkg])
  );
  const dependencyGraph = getDependencyGraph(getPackagesResult);

  const packageTasks = [...dependencyGraph].map(
    async ([pkgName, dependencies]) => {
      const dependent = indexedPackages.get(pkgName);
      if (!dependent) {
        throw new Error(
          "Data consistency problem. Dependent package should always be available in the indexed packages"
        );
      }

      await updateTsConfig(
        dependent.dir,
        [...dependencies.values()].map((dependencyName) => {
          const dependency = indexedPackages.get(dependencyName);
          if (!dependency) {
            throw new Error(
              "Data consistency problem. Dependency package should always be available in the indexed packages"
            );
          }
          return dependency;
        })
      );
    }
  );

  await Promise.all([
    ...packageTasks,
    updateTsConfig(rootDir, getPackagesResult.packages),
  ]);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
