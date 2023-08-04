import { dirname } from "node:path";
import { access, mkdir, writeFile, constants, rm } from "node:fs/promises";

export interface File {
  name: string;
  content: string;
  encoding: "utf-8";
}

export interface Folder {
  name: string;
  files: File[];
  subFolders: Folder[];
}

export enum ProjectType {
  "vercel" = "vercel",
  "defaults" = "defaults",
  "remix-app-server" = "remix-app-server",
}

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
