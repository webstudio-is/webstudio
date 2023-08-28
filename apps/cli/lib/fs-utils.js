import { dirname } from "node:path";
import {
  access,
  mkdir,
  writeFile,
  constants,
  readFile,
} from "node:fs/promises";
const ensureFileInPath = async (filePath, content) => {
  const dir = dirname(filePath);
  await ensureFolderExists(dir);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    await writeFile(filePath, content || "", "utf8");
  }
};
const ensureFolderExists = async (folderPath) => {
  try {
    await access(folderPath, constants.F_OK);
  } catch {
    await mkdir(folderPath, { recursive: true });
  }
};
const loadJSONFile = async (filePath) => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};
export { ensureFileInPath, ensureFolderExists, loadJSONFile };
