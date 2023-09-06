import prompts, { type PromptObject } from "prompts";
import { ensureFolderExists, isFileExists } from "../fs-utils";
import { chdir, cwd } from "node:process";
import { join } from "node:path";
import { link } from "./link";
import { sync } from "./sync";
import { build } from "./build";

export const initFlow = async () => {
  const isProjectConfigured = await isFileExists(".webstudio/config.json");
  const prompsList: PromptObject[] = [];

  if (isProjectConfigured === false) {
    prompsList.push(
      {
        type: "confirm",
        name: "folder",
        message: "Do you want to create a folder",
        initial: true,
      },
      {
        type: (prev) => (prev === true ? "text" : null),
        name: "folderName",
        message: "Enter a project name",
      },
      {
        type: (prev) => (prev === undefined ? null : "text"),
        name: "projectLink",
        message: "Enter a project link",
      }
    );
  }

  const response = await prompts(prompsList);

  /*
    If users wanted to create a folder, we need to create it and link the project.
  */
  if (response.folderName) {
    await ensureFolderExists(join(cwd(), response.folderName));
    chdir(join(cwd(), response.folderName));
    await link({ link: response.projectLink });
  }

  /*
    If the project is already set up, we can sync and build it.
  */
  await sync();
  await build({ assets: true });
};
