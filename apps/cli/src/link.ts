import { stdin as input, stdout as output, exit } from "node:process";
import * as readline from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
import { GLOBAL_CONFIG_FILE } from "./constants";
import type { Command } from "./args";

export const link: Command = async () => {
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
    if (token === undefined || projectId === undefined || host === undefined) {
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

    await writeFile(GLOBAL_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    rl.close();
    console.info(`Saved credentials for project ${projectId}.
You can find your config at ${GLOBAL_CONFIG_FILE}
      `);

    exit(0);
  } catch (error) {
    console.error(error);
    console.error("Invalid share link.");
    exit(1);
  }
};
