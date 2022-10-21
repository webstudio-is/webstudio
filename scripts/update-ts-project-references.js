/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const fs = require("fs/promises");
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

(async () => {
  const getPackagesResult = await getPackages(path.join(__dirname, ".."));
  const indexedPackages = new Map(
    getPackagesResult.packages.map((pkg) => [pkg.packageJson.name, pkg])
  );
  const dependencyGraph = getDependencyGraph(getPackagesResult);

  const tasks = [...dependencyGraph].map(async ([pkgName, dependencies]) => {
    const dependent = indexedPackages.get(pkgName);
    if (!dependent) {
      throw new Error(
        "Data consistency problem. Dependent package should always be available in the indexed packages"
      );
    }

    const tsConfigPath = path.join(dependent.dir, "tsconfig.json");
    const tsConfigContent = await fs.readFile(tsConfigPath, "utf8");
    /** @type TSConfig */
    const tsConfig = JSON.parse(tsConfigContent);

    const dependencyPaths = [...dependencies.values()]
      .map((dependencyName) => {
        const dependency = indexedPackages.get(dependencyName);
        if (!dependency) {
          throw new Error(
            "Data consistency problem. Dependency package should always be available in the indexed packages"
          );
        }
        return path.relative(dependent.dir, dependency.dir);
      })
      .sort();

    if (
      stringArrayEquals(
        dependencyPaths,
        (tsConfig.references || []).map((reference) => reference.path)
      )
    ) {
      return;
    }

    await fs.writeFile(
      tsConfigPath,
      format(
        tsConfigPath,
        JSON.stringify({
          ...tsConfig,
          references: dependencyPaths.map((path) => ({ path })),
        })
      )
    );
  });

  await Promise.all(tasks);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
