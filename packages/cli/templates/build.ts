import { readdirSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { type Folder, SupportedProjects } from "../src/args";
import { ensureFileInPath } from "../src/fs-utils";

const TEMPLATES_TO_BUILD = Object.keys(SupportedProjects);
const TEMPLATES_JSON: Record<string, Folder> = {};
const TEMPLATES_JSON_PATH = new URL(
  "../src/__generated__/templates.ts",
  import.meta.url
).pathname;
const ROUTER_TEMPLATE_PATH = new URL(
  "../src/__generated__/router.ts",
  import.meta.url
).pathname;
const DEFUALT_ASSETS_PATH = new URL(
  "../src/__generated__/assets.ts",
  import.meta.url
).pathname;

console.info("Building Templates...");
await rm(new URL("../src/__generated__", import.meta.url).pathname, {
  recursive: true,
  force: true,
});

const parseFolder = (folderPath: string): Folder | undefined => {
  const isDirectory = lstatSync(folderPath).isDirectory();
  if (isDirectory === false) {
    return;
  }

  const folderName = folderPath.split("/").pop();
  if (folderName === undefined) {
    return;
  }

  const folder: Folder = {
    name: folderName,
    files: [],
    subFolders: [],
  };

  const files = readdirSync(folderPath);

  for (const file of files) {
    const filePath = join(folderPath, file);
    const statSync = lstatSync(filePath);
    const isDirectory = statSync.isDirectory();
    const isFile = statSync.isFile();

    if (isDirectory) {
      const subFolder = parseFolder(filePath);
      if (subFolder !== undefined) {
        folder.subFolders.push(subFolder);
      }
    }

    if (isFile) {
      const content = readFileSync(filePath, "utf-8");
      folder.files.push({
        name: file,
        content,
        encoding: "utf-8",
      });
    }
  }

  return folder;
};

await ensureFileInPath(TEMPLATES_JSON_PATH);

for (const template of TEMPLATES_TO_BUILD) {
  const templatePath = new URL(`./${template}`, import.meta.url).pathname;
  const templateFiles = parseFolder(templatePath);
  if (templateFiles === undefined) {
    throw new Error(`Template ${template} not found`);
  }
  TEMPLATES_JSON[template] = templateFiles;
}

const content = `/*

This is an auto-generated file. Please don't change manually.
If needed to make any changes. Add them to ./templates folder and run pnpm run build:templates

*/

import type { Folder, ProjectTarget } from "../args"\n
export const templates: Record<ProjectTarget, Folder> = ${JSON.stringify(
  TEMPLATES_JSON,
  null,
  2
)}`;

writeFileSync(TEMPLATES_JSON_PATH, content, "utf-8");

/*
  Building route template
*/
const routeTemplateFile = readFileSync(
  new URL("./route-template.ts", import.meta.url).pathname,
  "utf-8"
);
const routeTemplateContent = `/*

This is an auto-generated file. Please don't change manually.
If needed to make any changes. Add them to ./templates folder and run pnpm run build:templates

*/

import { ASSETS_BASE } from "../config";

export const getRouteTemplate = () => {
  return \`${routeTemplateFile.replace(/ASSETS_BASE/g, '"${ASSETS_BASE}"')}\`
  }`;

await ensureFileInPath(ROUTER_TEMPLATE_PATH, routeTemplateContent);

/*
  Building default assets
*/

const parseAssets = (folderPath: string): Folder | undefined => {
  const folderName = folderPath.split("/").pop();
  if (folderName === undefined) {
    return;
  }

  const folder: Folder = {
    name: folderName,
    files: [],
    subFolders: [],
  };

  const files = readdirSync(folderPath);
  for (const file of files) {
    const filePath = join(folderPath, file);
    const statSync = lstatSync(filePath);
    const isDirectory = statSync.isDirectory();
    const isFile = statSync.isFile();

    if (isDirectory) {
      const subFolder = parseAssets(filePath);
      if (subFolder !== undefined) {
        folder.subFolders.push(subFolder);
      }
    }

    if (isFile) {
      const content = readFileSync(filePath, "base64");
      folder.files.push({
        name: file,
        content,
        encoding: "base64",
      });
    }
  }

  return folder;
};

const assets = parseAssets(new URL("./assets", import.meta.url).pathname);

const assetsContent = `/*
This is an auto-generated file. Please don't change manually.
If needed to make any changes. Add them to ./public folder and run pnpm run build:templates
*/

import type { Folder } from "../args"\n
export const assets: Folder = ${JSON.stringify(assets, null, 2)}`;

await ensureFileInPath(DEFUALT_ASSETS_PATH, assetsContent);
