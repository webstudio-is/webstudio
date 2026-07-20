const e2eFileSuffix = ".e2e.ts";
const shardNamePattern = "shard-\\d+";
const shardTagPattern = new RegExp(`\\[(${shardNamePattern})\\]`, "g");
const trailingShardTagsPattern = new RegExp(`(\\.\\[${shardNamePattern}\\])+$`);

export const getE2eFileShards = (fileName: string) =>
  [...fileName.matchAll(shardTagPattern)].map((match) => match[1]);

export const getE2eSuiteName = (fileName: string) => {
  const name = fileName.endsWith(e2eFileSuffix)
    ? fileName.slice(0, -e2eFileSuffix.length)
    : fileName;
  return name.replace(trailingShardTagsPattern, "").replaceAll("-", " ");
};

export const getE2eShards = (fileNames: readonly string[]) => {
  const e2eFiles = fileNames
    .filter((fileName) => fileName.endsWith(e2eFileSuffix))
    .map((fileName) => ({ fileName, shards: getE2eFileShards(fileName) }));
  const unassignedFiles = e2eFiles
    .filter(({ shards }) => shards.length === 0)
    .map(({ fileName }) => fileName);
  if (unassignedFiles.length > 0) {
    throw new Error(
      `Every e2e file must have a shard tag: ${unassignedFiles.join(", ")}`
    );
  }
  return [...new Set(e2eFiles.flatMap(({ shards }) => shards))].sort(
    (left, right) => left.localeCompare(right, undefined, { numeric: true })
  );
};

export const getE2eTestModules = (
  fileNames: readonly string[],
  shard?: string
) =>
  fileNames
    .filter((fileName) => fileName.endsWith(e2eFileSuffix))
    .filter(
      (fileName) =>
        shard === undefined ||
        shard === "" ||
        getE2eFileShards(fileName).includes(shard)
    )
    .sort()
    .map((fileName) => `./tests/${fileName}`);

export const isE2eTestInShard = ({
  fileName,
  shard,
  distributionIndex,
}: {
  fileName: string;
  shard: string | undefined;
  distributionIndex: number;
}) => {
  if (shard === undefined || shard === "") {
    return true;
  }
  const shards = getE2eFileShards(fileName);
  const shardIndex = shards.indexOf(shard);
  return shardIndex !== -1 && distributionIndex % shards.length === shardIndex;
};
