import { cwd, exit } from "node:process";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { cancel, isCancel, log, text } from "@clack/prompts";
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
  const url = new URL(value);
  const origin = url.origin;
  const token = url.searchParams.get("authToken");
  // @todo parse with URLPattern once landed in node
  const segments = url.pathname.split("/").slice(1);
  if (segments.length !== 2 || segments[0] !== "builder") {
    throw Error("Segments not matching");
  }
  const [_builder, projectId] = segments;
  if (token == null) {
    throw Error("Token is missing");
  }
  return {
    origin,
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
