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

const wait = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

export const withFileLock = async <Result>(
  filePath: string,
  callback: () => Promise<Result>
) => {
  const lockPath = `${filePath}.lock`;
  await createFolderIfNotExists(dirname(filePath));
  const start = Date.now();
  while (true) {
    try {
      await mkdir(lockPath, { recursive: false });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - start > 10_000) {
        throw new Error(`Timed out waiting for file lock ${lockPath}`);
      }
      await wait(50);
    }
  }
  try {
    return await callback();
  } finally {
    await rm(lockPath, { recursive: true, force: true });
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
