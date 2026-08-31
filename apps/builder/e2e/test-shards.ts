const e2eFileSuffix = ".e2e.ts";
const shardTagPattern = /\[(shard-\d+)\]/g;
const shardNamePattern = /^shard-\d+$/;

export const getE2eFileShards = (fileName: string) => {
  const shards = [...fileName.matchAll(shardTagPattern)].map(
    (match) => match[1]
  );
  if (shards.length === 0) {
    throw new Error(`Every e2e file must have a shard tag: ${fileName}`);
  }
  return shards;
};

export const getE2eShardMatrix = (fileNames: readonly string[]) => {
  const shardGroups = new Map<string, Set<string>>();
  for (const fileName of fileNames) {
    if (fileName.endsWith(e2eFileSuffix) === false) {
      continue;
    }
    const shards = getE2eFileShards(fileName);
    const group = shards.join(",");
    for (const shard of shards) {
      const groups = shardGroups.get(shard) ?? new Set<string>();
      groups.add(group);
      shardGroups.set(shard, groups);
    }
  }

  return [...shardGroups]
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, { numeric: true })
    )
    .map(([shard, groups]) => {
      if (groups.size !== 1) {
        throw new Error(
          `Every file selected by ${shard} must use the same shard tags`
        );
      }
      const shards = [...groups][0].split(",");
      const partition =
        shards.length === 1
          ? ""
          : `${shards.indexOf(shard) + 1}/${shards.length}`;
      return { shard, partition };
    });
};

export const getE2eTestMatch = (shard: string | undefined) => {
  if (shard === undefined || shard === "") {
    return /tests\/.*\.e2e\.ts/;
  }
  if (shardNamePattern.test(shard) === false) {
    throw new Error(`Invalid e2e shard: ${shard}`);
  }
  return new RegExp(`tests/.*\\[${shard}\\].*\\.e2e\\.ts$`);
};
