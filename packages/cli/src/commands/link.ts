import { stdin, stdout, cwd } from "node:process";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
import { GLOBAL_CONFIG_FILE, LOCAL_CONFIG_FILE } from "../config";
import { ensureFileInPath } from "../fs-utils";

export const link = async () => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const shareLink = await rl.question(`Paste share link (with build access): `);

  const shareLinkUrl = new URL(shareLink);
  const host = shareLinkUrl.origin;
  const token = shareLinkUrl.searchParams.get("authToken");
  const paths = shareLinkUrl.pathname.split("/").slice(1);

  if (paths[0] !== "builder" || paths.length !== 2) {
    throw new Error("Invalid share link.");
  }
  const projectId = paths[1];
  if (token === undefined || projectId === undefined || host === undefined) {
    throw new Error("Invalid share link.");
  }

  try {
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

    await ensureFileInPath(
      join(cwd(), LOCAL_CONFIG_FILE),
      JSON.stringify({ projectId }, null, 2)
    );
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENONET") {
      throw new Error(`Global config file is not found`);
    }

    throw error;
  }
};
