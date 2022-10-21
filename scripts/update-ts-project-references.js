/* eslint-disable @typescript-eslint/no-var-requires */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fsP = require("fs/promises");
const { getDependentsGraph } = require("@changesets/get-dependents-graph");
const { getPackages } = require("@manypkg/get-packages");
/**
 * @typedef {Awaited<ReturnType<typeof getPackages>>} GetPackagesResult
 * @typedef {GetPackagesResult["packages"][number]} Package
 * @typedef {Map<string, Set<string>} DependencyGraph
 * @typedef {{ references?: { path: string }[] }} TSConfig
 */

/**
 * @param {string[]} arrA
 * @param {string[]} arrB
 * @returns boolean
 */
const stringArrayEquals = (arrA, arrB) => {
  return (
    arrA.length === arrB.length && arrA.every((itemA, i) => itemA === arrB[i])
  );
};

/** @type {import('prettier') | undefined} */
let prettier;

/**
 * @param {string} filePath
 * @param {string} content
 * @returns string
 */
const format = (filePath, content) => {
  if (!prettier) {
    prettier = require("prettier");
  }
  const config = prettier.resolveConfig(filePath);
  return prettier.format(content, {
    ...config,
    filepath: filePath,
  });
};

/**
 * @param getPackagesResult {GetPackagesResult}
 * @return {DependencyGraph}
 */
const getDependencyGraph = (getPackagesResult) => {
  /** @type DependencyGraph */
  const graph = new Map();

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

/**
 * @param {string} filePath
 * @param {string} content
 */
const updateFile = async (filePath, content) => {
  await fsP.writeFile(filePath, format(filePath, content));
  await spawn("git", ["add", filePath]);
};

/**
 * @param {string} dependentDir
 * @param {Packages[]} dependencies
 */
const updateTSConfig = async (dependentDir, dependencies) => {
  const tsConfigPath = path.join(dependentDir, "tsconfig.json");
  const tsConfigContent = await fsP.readFile(tsConfigPath, "utf8");
  /** @type TSConfig */
  const tsConfig = JSON.parse(tsConfigContent);

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

      await updateTSConfig(
        dependent.dir,
        [...dependencies.values()].map((dependencyName) => {
          const dependency = indexedPackages.get(dependencyName);
          if (!dependency) {
            throw new Error(
              "Data consistency problem. Dependency package should always be available in the indexed packages"
            );
          }
          return dependency;
        }),
        indexedPackages
      );
    }
  );

  await Promise.all([
    ...packageTasks,
    updateTSConfig(rootDir, getPackagesResult.packages),
  ]);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
