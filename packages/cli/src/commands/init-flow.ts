import { chdir, cwd } from "node:process";
import { join } from "node:path";
import pc from "picocolors";
import {
  cancel,
  confirm,
  isCancel,
  log,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { $ } from "execa";
import { titleCase } from "title-case";
import { createFolderIfNotExists, isFileExists } from "../fs-utils";
import { PROJECT_TEMPALTES } from "../config";
import { link, validateShareLink } from "./link";
import { sync } from "./sync";
import { build, buildOptions } from "./build";
import type { StrictYargsOptionsToInterface } from "./yargs-types";

type ProjectTemplates = (typeof PROJECT_TEMPALTES)[number];

const exitIfCancelled = <Value>(value: Value | symbol): Value => {
  if (isCancel(value)) {
    cancel("Project initialization is cancelled");
    process.exit(0);
  }
  return value;
};

export const initFlow = async (
  options: StrictYargsOptionsToInterface<typeof buildOptions>
) => {
  const isProjectConfigured = await isFileExists(".webstudio/config.json");
  let shouldInstallDeps = false;
  let folderName: undefined | string;
  let projectTemplate: ProjectTemplates | undefined = undefined;

  if (isProjectConfigured === false) {
    const shouldCreateFolder = exitIfCancelled(
      await confirm({
        message:
          "Would you like to create a project folder? (no to use current folder)",
        initialValue: true,
      })
    );

    if (shouldCreateFolder === true) {
      folderName = exitIfCancelled(
        await text({
          message: "Please enter a project name",
          validate(value) {
            if (value.length === 0) {
              return "Folder name is required";
            }
          },
        })
      );

      await createFolderIfNotExists(join(cwd(), folderName));
      chdir(join(cwd(), folderName));
    }

    const shareLink = exitIfCancelled(
      await text({
        message: "Please paste a link from the Share Dialog in the builder",
        validate: validateShareLink,
      })
    );

    await link({ link: shareLink });

    projectTemplate = exitIfCancelled(
      await select({
        message: "Where would you like to deploy your project?",
        options: PROJECT_TEMPALTES.map((template) => ({
          value: template,
          label: titleCase(template),
        })),
      })
    );

    shouldInstallDeps = exitIfCancelled(
      await confirm({
        message: "Would you like to install dependencies? (recommended)",
        initialValue: true,
      })
    );
  }

  /*
    If a project is already linked, we sync direclty without asking for deploy target.
    We need to request for deploy target here as the current flow is running in a existing project.
  */

  if (projectTemplate === undefined) {
    projectTemplate = exitIfCancelled(
      await select({
        message: "Where would you like to deploy your project?",
        options: PROJECT_TEMPALTES.map((template) => ({
          value: template,
          label: titleCase(template),
        })),
      })
    );
  }

  await sync({ buildId: undefined, origin: undefined, authToken: undefined });

  await build({
    ...options,
    ...(projectTemplate && { template: [projectTemplate] }),
  });

  if (shouldInstallDeps === true) {
    const install = spinner();
    install.start("Installing dependencies");
    await $`npm install`;
    install.stop("Installed dependencies");
  }

  log.message();
  log.message(pc.green(pc.bold(`Your project was successfully synced 🎉`)));
  log.message(
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
