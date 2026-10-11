import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const manifestPath = join(
  "app",
  "__generated__",
  "$resources.static-text-pages.json"
);
const pagePaths = JSON.parse(await readFile(manifestPath, "utf8"));
if (
  Array.isArray(pagePaths) === false ||
  pagePaths.some((pagePath) => typeof pagePath !== "string")
) {
  throw new Error("Invalid static text pages manifest");
}
const outputDirectory = resolve("dist", "client");
const prerenderWrapper = "<head></head>\n";

for (const pagePath of pagePaths) {
  const relativePagePath = pagePath.replace(/^\/+/, "");
  const usesIndexFile =
    relativePagePath === "" || relativePagePath.endsWith("/");
  const outputFile = resolve(
    outputDirectory,
    relativePagePath,
    ...(usesIndexFile ? ["index.html"] : [])
  );
  const relativeOutputFile = relative(outputDirectory, outputFile);
  if (
    relativeOutputFile === ".." ||
    relativeOutputFile.startsWith(`..${sep}`) ||
    isAbsolute(relativeOutputFile)
  ) {
    throw new Error(`Invalid static text page path: ${pagePath}`);
  }

  const prerenderedDirectory = usesIndexFile
    ? dirname(outputFile)
    : outputFile;
  const prerenderedContent = await readFile(
    join(prerenderedDirectory, "index.html"),
    "utf8"
  );
  if (prerenderedContent.startsWith(prerenderWrapper) === false) {
    throw new Error(`Invalid prerendered text page: ${pagePath}`);
  }
  const content = prerenderedContent.slice(prerenderWrapper.length);
  if (usesIndexFile === false) {
    await rm(prerenderedDirectory, { recursive: true, force: true });
  }
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, content);
}
