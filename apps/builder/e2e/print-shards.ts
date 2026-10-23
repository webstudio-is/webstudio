import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getE2eShardMatrix } from "./test-shards";

const testDirectory = fileURLToPath(new URL("./tests", import.meta.url));
console.info(JSON.stringify(getE2eShardMatrix(await readdir(testDirectory))));
