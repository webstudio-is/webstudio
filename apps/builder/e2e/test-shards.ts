const e2eFileSuffix = ".e2e.ts";
const shardTagPattern = /\[(shard-\d+)\]/g;
const shardNamePattern = /^shard-\d+$/;

export const getE2eFileShard = (fileName: string) => {
  const shards = [...fileName.matchAll(shardTagPattern)].map(
    (match) => match[1]
  );
  if (shards.length !== 1) {
    throw new Error(
      `Every e2e file must have exactly one shard tag: ${fileName}`
    );
  }
  return shards[0];
};

export const getE2eShards = (fileNames: readonly string[]) => {
  const shards = fileNames
    .filter((fileName) => fileName.endsWith(e2eFileSuffix))
    .map(getE2eFileShard);
  return [...new Set(shards)].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true })
  );
};

export const getE2eTestMatch = (shard: string | undefined) => {
  if (shard === undefined || shard === "") {
    return /tests\/.*\.e2e\.ts/;
  }
  if (shardNamePattern.test(shard) === false) {
    throw new Error(`Invalid e2e shard: ${shard}`);
  }
  return new RegExp(`tests/.*\\[${shard}\\]\\.e2e\\.ts$`);
};
