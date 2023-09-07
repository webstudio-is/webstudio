import prompts, { type PromptObject } from "prompts";
import { ensureFolderExists, isFileExists } from "../fs-utils";
import { chdir, cwd, stdout as shellOutput } from "node:process";
import { spawn } from "node:child_process";
import { join } from "node:path";
import ora from "ora";
import { link } from "./link";
import { sync } from "./sync";
import { build, buildOptions } from "./build";
import type { StrictYargsOptionsToInterface } from "./yargs-types";

export const initFlow = async (
  options: StrictYargsOptionsToInterface<typeof buildOptions>
) => {
  const isProjectConfigured = await isFileExists(".webstudio/config.json");
  const prompsList: PromptObject[] = [];
  const spinner = ora().start();

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
  await build(options);

  spinner.text = "Installing dependencies";
  const { stderr } = await exec("npm", ["install"]);
  if (stderr) {
    throw stderr;
  }

  spinner.text = "Starting dev server";
  spinner.stop();
  const { stderr: devServerError } = await exec("npm", ["run", "dev"]);
  if (devServerError) {
    throw devServerError;
  }
};

const exec = (
  command: string,
  args?: ReadonlyArray<string>
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let stdout = "";
    let stderr = "";
    process.on("error", reject);
    process.on("exit", (code) => {
      if (code !== 0) {
        reject({ stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });

    process.stderr.setEncoding("utf8");
    process.stdout.setEncoding("utf8");
    process.stdout.on("data", (data) => {
      stdout += data;
      shellOutput.write(data);
    });
    process.stderr.on("error", (error) => (stderr += error));
  });
};
