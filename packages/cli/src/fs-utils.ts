import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  rename,
  rm,
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

export const createFileIfNotExists = async (
  filePath: string,
  content?: string
) => {
  const dir = dirname(filePath);

  await createFolderIfNotExists(dir);

  try {
    await access(filePath, constants.F_OK);
  } catch {
    await writeFile(filePath, content ?? "", "utf8");
  }
};

export const createFolderIfNotExists = async (folderPath: string) => {
  try {
    await access(folderPath, constants.F_OK);
  } catch {
    await mkdir(folderPath, { recursive: true });
  }
};

export const writeFileAtomic = async (filePath: string, content: string) => {
  const temporaryFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await createFolderIfNotExists(dirname(filePath));
  try {
    await writeFile(temporaryFilePath, content, "utf8");
    await rename(temporaryFilePath, filePath);
  } catch (error) {
    await rm(temporaryFilePath, { force: true });
    throw error;
  }
};

export const loadJSONFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};
