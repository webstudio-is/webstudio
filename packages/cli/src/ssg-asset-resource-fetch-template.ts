import { readFile } from "node:fs/promises";

const templateUrl = new URL(
  /* @vite-ignore */ "../templates/ssg/app/asset-resource-fetch.ts",
  import.meta.url
);

export const readSsgAssetResourceFetchTemplate = () =>
  readFile(templateUrl, "utf8");
