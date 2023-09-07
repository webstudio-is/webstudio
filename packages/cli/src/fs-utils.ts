import { dirname } from "node:path";
import {
  access,
  mkdir,
  writeFile,
  constants,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import type { Folder } from "./args";
import merge from "deepmerge";

export const isFileExists = async (filePath: string) => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

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

export const parseFolderAndWriteFiles = async (
  folder: Folder,
  path: string
) => {
  for (const file of folder.files) {
    const filePath = join(path, file.name);
    await ensureFileInPath(filePath);

    let content = file.content;

    if (file.merge) {
      let existingContent = await readFile(filePath, "utf8");

      if (existingContent === "") {
        existingContent = "{}";
      }

      content = JSON.stringify(
        merge(JSON.parse(file.content), JSON.parse(existingContent)),
        null,
        "  "
      );
    }

    await writeFile(filePath, content, file.encoding);
  }

  for (const subFolder of folder.subFolders) {
    await parseFolderAndWriteFiles(subFolder, join(path, subFolder.name));
  }
};

export const parseFolderAndWriteAssets = async (
  folder: Folder,
  path: string
) => {
  for (const file of folder.files) {
    const filePath = join(path, file.name);
    /*
      For default assets, we can skip writing them again to the destination if a file already exists.
      This will help in users replacing the default asset with their own
    */
    try {
      await access(filePath);
    } catch (error) {
      await ensureFileInPath(filePath, file.content);
      await writeFile(filePath, file.content, file.encoding);
    }
  }

  for (const subFolder of folder.subFolders) {
    await parseFolderAndWriteAssets(subFolder, join(path, subFolder.name));
  }
};
