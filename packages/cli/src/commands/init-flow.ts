import prompts from "prompts";
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
  let shouldInstallDeps = false;

  if (isProjectConfigured === false) {
    const { createFolder } = await prompts([
      {
        type: "confirm",
        name: "createFolder",
        message: "Do you want to create a folder",
        initial: true,
        onState: (state) => {
          if (state.aborted) {
            process.nextTick(() => {
              process.exit(0);
            });
          }
        },
      },
    ]);

    if (createFolder === true) {
      const { folderName } = await prompts([
        {
          type: "text",
          name: "folderName",
          message: "Enter a project name",
          onState: (state) => {
            if (state.aborted) {
              process.nextTick(() => {
                process.exit(0);
              });
            }
          },
        },
      ]);

      if (folderName === undefined) {
        throw new Error("Folder name is required");
      }
      await ensureFolderExists(join(cwd(), folderName));
      chdir(join(cwd(), folderName));
    }

    const { projectLink } = await prompts([
      {
        type: "text",
        name: "projectLink",
        message: "Enter a project link",
        onState: (state) => {
          if (state.aborted) {
            process.nextTick(() => {
              process.exit(0);
            });
          }
        },
      },
    ]);

    if (projectLink === undefined) {
      throw new Error(`Project Link is required`);
    }
    await link({ link: projectLink });

    const { installDeps } = await prompts([
      {
        type: "confirm",
        name: "installDeps",
        message: "Do you want to install dependencies",
        initial: true,
      },
    ]);
    shouldInstallDeps = installDeps;
  }

  await sync();
  await build(options);

  if (shouldInstallDeps === true) {
    const spinner = ora().start();
    spinner.text = "Installing dependencies";
    const { stderr } = await exec("npm", ["install"]);
    if (stderr) {
      throw stderr;
    }
    spinner.succeed("Installed Dependencies");
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
