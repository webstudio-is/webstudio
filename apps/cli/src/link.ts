import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { readFile } from "node:fs/promises";
import { GLOBAL_CONFIG_FILE } from "./constants";
import type { Command } from "./types";

export const link: Command = async (args) => {
  const rl = readline.createInterface({ input, output });
  const shareLink = await rl.question(`Paste share link (with build access): `);
  try {
    const shareLinkUrl = new URL(shareLink);
    const host = shareLinkUrl.origin;
    const token = shareLinkUrl.searchParams.get("authToken");
    const paths = shareLinkUrl.pathname.split("/").filter(Boolean);
    if (paths[0] !== "builder" || paths.length !== 2) {
      throw new Error("Invalid share link.");
    }
    const projectId = paths[1];
    if (!token || !projectId || !host) {
      throw new Error("Invalid share link.");
    }

    const currentConfig = await readFile(GLOBAL_CONFIG_FILE, "utf-8");
    const currentConfigJson = JSON.parse(currentConfig);

    const newConfig = {
      ...currentConfigJson,
      [projectId]: {
        host,
        token,
      },
    };

    await fs.writeFile(GLOBAL_CONFIG_FILE, JSON.stringify(newConfig, null, 2));

    rl.close();
    console.log(`Saved credentials for project ${projectId}.`);
    return;
  } catch (error) {
    console.error(error);
    console.error("Invalid share link.");
    process.exit(1);
  }
};
