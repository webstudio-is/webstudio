import { dirname } from "node:path";
import { access, mkdir, writeFile, constants, rm } from "node:fs/promises";

export const ensureFileInPath = async (filePath: string, content?: string) => {
  const dir = dirname(filePath);

  await ensureFolderExists(dir);

  try {
    await access(filePath, constants.F_OK);
  } catch (err) {
    await writeFile(filePath, content || "", "utf8");
  }
};

export const ensureFolderExists = async (folderPath: string) => {
  try {
    await access(folderPath, constants.F_OK);
  } catch (err) {
    await mkdir(folderPath, { recursive: true });
  }
};

export const deleteFolderIfExists = async (generatedDir: string) => {
  try {
    await rm(generatedDir, { recursive: true });
    console.log("Folder deleted successfully (if it existed).");
  } catch (err) {
    if (err.code === "ENOENT") {
      return;
    }
    throw err;
  }
};
