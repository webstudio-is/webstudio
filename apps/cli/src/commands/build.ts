import { writeFile, access } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import { ensureFileInPath } from "../fs-utils";
import type { Command, Folder } from "../args";
import { prebuild } from "../prebuild";
import { templates } from "../__generated__/templates";
import { LOCAL_DATA_FILE } from "../config";

export const build: Command = async () => {
  try {
    await access(LOCAL_DATA_FILE);
    await parseFolderAndWriteFiles(templates["defaults"], cwd());
    await prebuild();
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `You need to link a webstudio project before building it. Run \`webstudio link\` to link a project.`
      );
    }
    throw error;
  }
};

const parseFolderAndWriteFiles = async (folder: Folder, path: string) => {
  for (const file of folder.files) {
    const filePath = join(path, file.name);
    await ensureFileInPath(filePath);
    await writeFile(filePath, file.content, "utf8");
  }

  for (const subFolder of folder.subFolders) {
    await parseFolderAndWriteFiles(subFolder, join(path, subFolder.name));
  }
};
