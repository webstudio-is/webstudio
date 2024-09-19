import { cwd, exit } from "node:process";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { cancel, isCancel, log, text } from "@clack/prompts";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  type GlobalConfig,
  jsonToGlobalConfig,
  type LocalConfig,
} from "../config";
import { createFileIfNotExists } from "../fs-utils";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

const parseShareLink = (value: string) => {
  // value.replaceAll("'", "") is used to remove single quotes from the URL on Windows.
  // This is necessary because the following pnpm script works on macOS and Linux but fails here on Windows:
  // "fixtures:link": "pnpm cli link --link https://p-cddc1d44-af37-4cb6-a430-d300cf6f932d-dot-${BUILDER_HOST:-main.development.webstudio.is}'?authToken=1cdc6026-dd5b-4624-b89b-9bd45e9bcc3d'",
  // On Windows, single quotes are incorrectly included in the URL.
  const url = new URL(value.replaceAll("'", ""));

  const token = url.searchParams.get("authToken");

  // eslint-disable-next-line prefer-const
  let { projectId, sourceOrigin } = parseBuilderUrl(url.href);

  if (projectId === undefined) {
    // Support deprecated links until the end of 2024
    const segments = url.pathname.split("/").slice(1);
    if (segments.length !== 2 || segments[0] !== "builder") {
      throw Error("Segments not matching");
    }
    projectId = segments[1];
  }

  if (token == null) {
    throw Error("Token is missing");
  }

  return {
    origin: sourceOrigin,
    projectId,
    token,
  };
};

export const validateShareLink = (value: string) => {
  if (value.length === 0) {
    return "Share link is required";
  }
  if (URL.canParse(value) === false) {
    return "Share link is invalid";
  }
  try {
    parseShareLink(value);
  } catch {
    return "Share link is invalid";
  }
};

export const linkOptions = (yargs: CommonYargsArgv) =>
  yargs.option("link", {
    alias: "l",
    type: "string",
    describe: "Link to a webstudio project",
  });

export const link = async (
  options: StrictYargsOptionsToInterface<typeof linkOptions> | { link?: string }
) => {
  let shareLink: string | symbol;
  if (options.link) {
    shareLink = options.link;
  } else {
    shareLink = await text({
      message: "Please paste a link from the Share Dialog in the builder",
      validate: validateShareLink,
    });
    if (isCancel(shareLink)) {
      cancel("Project linking is cancelled");
      exit(1);
    }
  }

  const { origin, projectId, token } = parseShareLink(shareLink);

  const currentConfig = await readFile(GLOBAL_CONFIG_FILE, "utf-8");
  const currentConfigJson = jsonToGlobalConfig(JSON.parse(currentConfig));

  const newConfig: GlobalConfig = {
    ...currentConfigJson,
    [projectId]: {
      origin,
      token,
    },
  };

  await writeFile(GLOBAL_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  log.info(`Saved credentials for project ${projectId}.
You can find your config at ${GLOBAL_CONFIG_FILE}`);

  const localConfig: LocalConfig = {
    projectId,
  };

  await createFileIfNotExists(
    join(cwd(), LOCAL_CONFIG_FILE),
    JSON.stringify(localConfig, null, 2)
  );
  log.step("The project is linked successfully");
};
