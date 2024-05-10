import { createFolderIfNotExists, isFileExists } from "../fs-utils";
import { chdir, cwd } from "node:process";
import { join } from "node:path";
import ora from "ora";
import { link } from "./link";
import { sync } from "./sync";
import { build, buildOptions } from "./build";
import { prompt } from "../prompts";
import type { StrictYargsOptionsToInterface } from "./yargs-types";
import pc from "picocolors";
import { $ } from "execa";
import { PROJECT_TEMPALTES } from "../config";
import { titleCase } from "title-case";

type ProjectTemplates = (typeof PROJECT_TEMPALTES)[number];

export const initFlow = async (
  options: StrictYargsOptionsToInterface<typeof buildOptions>
) => {
  const isProjectConfigured = await isFileExists(".webstudio/config.json");
  let shouldInstallDeps = false;
  let folderName;
  let projectTemplate: ProjectTemplates | undefined = undefined;

  if (isProjectConfigured === false) {
    const { shouldCreateFolder } = await prompt({
      type: "confirm",
      name: "shouldCreateFolder",
      message:
        "Would you like to create a project folder? (no to use current folder)",
      initial: true,
    });

    if (shouldCreateFolder === true) {
      folderName = (
        await prompt({
          type: "text",
          name: "folderName",
          message: "Please enter a project name",
        })
      ).folderName;

      if (folderName === undefined) {
        throw new Error("Folder name is required");
      }
      await createFolderIfNotExists(join(cwd(), folderName));
      chdir(join(cwd(), folderName));
    }

    const { projectLink } = await prompt({
      type: "text",
      name: "projectLink",
      message: "Please paste a link from the Share dialog in the builder",
    });

    if (projectLink === undefined) {
      throw new Error(`Project Link is required`);
    }
    await link({ link: projectLink });

    const { deployTarget } = await prompt({
      type: "select",
      name: "deployTarget",
      message: "Where would you like to deploy your project?",
      choices: PROJECT_TEMPALTES.map((template) => {
        return {
          title: titleCase(template),
          value: template,
        };
      }),
    });
    projectTemplate = deployTarget;

    const { installDeps } = await prompt({
      type: "confirm",
      name: "installDeps",
      message: "Would you like to install dependencies? (recommended)",
      initial: true,
    });
    shouldInstallDeps = installDeps;
  }

  await sync({ buildId: undefined, origin: undefined, authToken: undefined });

  /*
    If a project is already linked, we sync direclty without asking for deploy target.
    We need to request for deploy target here as the current flow is running in a existing project.
  */

  if (projectTemplate === undefined) {
    const { deployTarget } = await prompt({
      type: "select",
      name: "deployTarget",
      message: "Where would you like to deploy your project?",
      choices: PROJECT_TEMPALTES.map((template) => {
        return {
          title: titleCase(template),
          value: template,
        };
      }),
    });
    projectTemplate = deployTarget;
  }

  await build({
    ...options,
    ...(projectTemplate && { template: [projectTemplate] }),
  });

  if (shouldInstallDeps === true) {
    const spinner = ora().start();
    spinner.text = "Installing dependencies";
    await $`npm install`;
    spinner.succeed("Installed dependencies");
  }

  console.info(pc.bold(pc.green(`\nYour project was successfully synced 🎉`)));
  console.info(
    [
      "Now you can:",
      folderName && `Go to your project: ${pc.dim(`cd ${folderName}`)}`,
      `Run ${pc.dim("npm run dev")} to preview your project on a local server.`,
      projectTemplate && getDeploymentInstructions(projectTemplate),
    ]
      .filter(Boolean)
      .join("\n")
  );
};

const getDeploymentInstructions = (
  deployTarget: ProjectTemplates
): string | undefined => {
  switch (deployTarget) {
    case "vercel":
      return `Run ${pc.dim("npx vercel")} to publish on Vercel.`;
    case "netlify-functions":
    case "netlify-edge-functions":
      return [
        `To deploy to Netlify, run the following commands: `,
        `Run ${pc.dim("npx netlify-cli login")} to login to Netlify.`,
        `Run ${pc.dim(
          "npx netlify-cli sites:create"
        )} to create a new project.`,
        `Run ${pc.dim("npx netlify-cli build")} to build the project`,
        `Run ${pc.dim("npx netlify-cli deploy")} to deploy on Netlify.`,
      ].join("\n");
  }
};
