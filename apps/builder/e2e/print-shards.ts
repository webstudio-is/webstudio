import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getE2eShards } from "./test-modules";

const testDirectory = fileURLToPath(new URL("./tests", import.meta.url));
console.info(JSON.stringify(getE2eShards(await readdir(testDirectory))));
