import { dirname, join } from "node:path";
import {
  access,
  mkdir,
  writeFile,
  constants,
  rm,
  readFile,
} from "node:fs/promises";
import { cwd } from "node:process";
import deepmerge from "deepmerge";
import { type ProjectTarget, type Folder } from "./args";

export const ensureFileInPath = async (filePath: string, content?: string) => {
  const dir = dirname(filePath);

  await ensureFolderExists(dir);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    await writeFile(filePath, content || "", "utf8");
  }
};

export const ensureFolderExists = async (folderPath: string) => {
  try {
    await access(folderPath, constants.F_OK);
  } catch {
    await mkdir(folderPath, { recursive: true });
  }
};

export const loadJSONFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    return null;
  }
};

export const scaffoldProjectTemplate = async (
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
