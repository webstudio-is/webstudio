import { access } from "node:fs/promises";
import type { Command } from "../args";
import { prebuild } from "../prebuild";
import { LOCAL_DATA_FILE } from "../config";

export const build: Command = async () => {
  try {
    await access(LOCAL_DATA_FILE);
    await prebuild();
  } catch (error) {
    console.log(error);
    if (error.code === "ENOENT") {
      throw new Error(
        `You need to link a webstudio project before building it. Run \`webstudio link\` to link a project.`
      );
    }
    throw error;
  }
};
