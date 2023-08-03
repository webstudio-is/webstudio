import { dirname } from "node:path";
import {
  access,
  mkdir,
  writeFile,
  constants,
  rm,
  readFile,
} from "node:fs/promises";
import { GLOBAL_CONFIG_FILE, type GlobalConfig } from "./constants";

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

export const deleteFolderIfExists = async (generatedDir: string) => {
  try {
    await rm(generatedDir, { recursive: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

export const loadGlobalConfigFile = async (): Promise<GlobalConfig | null> => {
  try {
    const content = await readFile(GLOBAL_CONFIG_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};
