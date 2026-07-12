export const getE2eTestModules = (
  fileNames: readonly string[],
  shard?: string
) =>
  fileNames
    .filter((fileName) => fileName.endsWith(".e2e.ts"))
    .filter(
      (fileName) =>
        shard === undefined || shard === "" || fileName.includes(`[${shard}]`)
    )
    .sort()
    .map((fileName) => `./tests/${fileName}`);
