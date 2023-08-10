import { writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import deepmerge from "deepmerge";
import { ensureFileInPath } from "../fs-utils";
import type { Command, ProjectTarget, Folder } from "../args";
import { prebuild } from "../prebuild";
import { templates } from "../__generated__/templates";

export const build: Command = async (args) => {
  const projectTarget = args.values.type as ProjectTarget;

  if (projectTarget === "defaults") {
    await parseFolderAndWriteFiles(templates["defaults"], cwd());
  } else {
    await scaffoldProjectTemplate(
      projectTarget,
      templates["defaults"],
      templates[projectTarget]
    );
  }

  await prebuild();
};

const scaffoldProjectTemplate = async (
  projectTarget: ProjectTarget,
  defaultTemplate: Folder,
  projectTemplate: Folder
) => {
  console.info(`Preparing default configurations for ${projectTarget}...`);
  const buildDir = cwd();

  await parseFolderAndWriteFiles(defaultTemplate, buildDir);
  await parseFolderAndWriteFiles(projectTemplate, buildDir);

  const defaultPackageJSON = JSON.parse(
    defaultTemplate.files.find((file) => file.name === "package.json")
      ?.content || "{}"
  );
  const projectPackageJSON = JSON.parse(
    projectTemplate.files.find((file) => file.name === "package.json")
      ?.content || "{}"
  );
  const packageJSON = deepmerge(defaultPackageJSON, projectPackageJSON);
  await writeFile(
    join(buildDir, "package.json"),
    JSON.stringify(packageJSON, null, 2),
    "utf8"
  );
};

const parseFolderAndWriteFiles = async (folder: Folder, path: string) => {
  for (const file of folder.files) {
    if (file.name === "package.json") {
      continue;
    }

    const filePath = join(path, file.name);
    await ensureFileInPath(filePath);
    await writeFile(filePath, file.content, "utf8");
  }

  for (const subFolder of folder.subFolders) {
    await parseFolderAndWriteFiles(subFolder, join(path, subFolder.name));
  }
};
