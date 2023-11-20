import { dirname } from "node:path";
import {
  access,
  mkdir,
  writeFile,
  constants,
  readFile,
} from "node:fs/promises";

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
