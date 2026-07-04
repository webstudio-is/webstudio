import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { log } from "@clack/prompts";
import { prebuild } from "../prebuild";
import { LOCAL_CONFIG_FILE, LOCAL_DATA_FILE } from "../config";
import { HandledCliError } from "../errors";
import {
  getPreviewUrl,
  runPreviewBuild,
  startPreviewServer,
  waitForPreviewExit,
} from "../preview-server";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { buildOptions } from "./build";
import { sync, defaultSyncDependencies, type SyncDependencies } from "./sync";

export const previewDefaultTemplate = ["defaults", "react-router"] as const;

const getPreviewTemplates = (template: string[]) => {
  const templates =
    template.length === 0 ? [...previewDefaultTemplate] : [...template];
  if (
    templates.includes("react-router") &&
    templates.includes("defaults") === false
  ) {
    templates.unshift("defaults");
  }
  return templates;
};

export const previewOptions = (yargs: CommonYargsArgv) =>
  buildOptions(yargs)
    .option("host", {
      type: "string",
      default: "127.0.0.1",
      describe: "Host used by the generated project production preview server",
    })
    .option("port", {
      type: "number",
      default: 5173,
      describe: "Port used by the generated project production preview server",
    })
    .option("generate", {
      type: "boolean",
      default: true,
      describe:
        "Regenerate project files from .webstudio/data.json before building and starting preview",
    })
    .example(
      "webstudio preview --port 5173",
      "Regenerate React Router app files, build them, and start the generated site at http://127.0.0.1:5173"
    )
    .example(
      "webstudio preview --template react-router --port 5173",
      "Regenerate files, build them, and start the generated site at http://127.0.0.1:5173"
    )
    .example(
      "webstudio preview --template react-router --generate false",
      "Build and start an already generated React Router app without rewriting project files"
    )
    .epilogue(
      [
        "Preview builds the generated app and starts its production server; it does not install app dependencies.",
        "For a fresh checkout, copied fixture, or newly generated app, run npm install or pnpm install in the generated project before preview.",
        "If preview exits with a missing command/package such as react-router, react-router-serve, or vite, install the generated app dependencies and retry.",
      ].join("\n")
    );

type PreviewOptions = StrictYargsOptionsToInterface<typeof previewOptions>;

const isPositivePort = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 65535;

export const validatePreviewServerOptions = ({
  host,
  port,
}: {
  host: string;
  port: number;
}) => {
  if (host.length === 0) {
    throw new Error("--host must not be empty.");
  }
  if (isPositivePort(port) === false) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }
};

const createSilentSpinner = () => ({
  start: () => undefined,
  message: () => undefined,
  stop: () => undefined,
});

const localPreviewFiles = [
  LOCAL_CONFIG_FILE,
  LOCAL_DATA_FILE,
  ".webstudio/auth.json",
];

export const getPreviewProjectDir = (projectDir = cwd()) =>
  join(projectDir, ".webstudio", "preview");

const runInDirectory = async <Result>(
  directory: string,
  callback: () => Promise<Result>
) => {
  const previousDirectory = cwd();
  chdir(directory);
  try {
    return await callback();
  } finally {
    chdir(previousDirectory);
  }
};

let runInDirectoryQueue = Promise.resolve();

const runExclusive = async <Result>(callback: () => Promise<Result>) => {
  const previousRun = runInDirectoryQueue;
  let releaseCurrentRun: () => void = () => undefined;
  runInDirectoryQueue = new Promise((resolve) => {
    releaseCurrentRun = resolve;
  });
  await previousRun.catch(() => undefined);
  try {
    return await callback();
  } finally {
    releaseCurrentRun();
  }
};

const preparePreviewDirectory = async (projectDir: string) => {
  const previewProjectDir = getPreviewProjectDir(projectDir);
  await rm(previewProjectDir, { recursive: true, force: true });
  await mkdir(join(previewProjectDir, ".webstudio"), { recursive: true });
  for (const file of localPreviewFiles) {
    await copyFile(join(projectDir, file), join(previewProjectDir, file)).catch(
      (error) => {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return;
        }
        throw error;
      }
    );
  }
  return previewProjectDir;
};

export const preparePreviewProject = async ({
  assets,
  template,
  generate,
  syncIfMissing = false,
  syncDependencies = defaultSyncDependencies,
  accessLocalDataFile = access,
  prebuildProject = prebuild,
}: {
  assets: boolean;
  template: string[];
  generate: boolean;
  syncIfMissing?: boolean;
  syncDependencies?: SyncDependencies;
  accessLocalDataFile?: typeof access;
  prebuildProject?: typeof prebuild;
}) => {
  const projectDir = cwd();
  try {
    await accessLocalDataFile(LOCAL_DATA_FILE);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      if (syncIfMissing) {
        await sync(
          {},
          {
            ...syncDependencies,
            spinner: createSilentSpinner,
          }
        );
      } else {
        log.error(
          "You need to link and sync a Webstudio project before previewing it. Run `webstudio link` and `webstudio sync` first."
        );
        throw new HandledCliError();
      }
    } else {
      throw error;
    }
  }

  const previewProjectDir = getPreviewProjectDir(projectDir);
  if (generate === false) {
    return { cwd: projectDir };
  }

  if (generate) {
    await runExclusive(async () => {
      await preparePreviewDirectory(projectDir);
      await runInDirectory(previewProjectDir, async () => {
        await prebuildProject({
          assets,
          template: getPreviewTemplates(template),
        });
      });
    });
  }

  return { cwd: previewProjectDir };
};

export const preview = async (options: PreviewOptions) => {
  validatePreviewServerOptions(options);
  const previewProject = await preparePreviewProject({
    assets: options.assets,
    template: options.template,
    generate: options.generate,
  });

  const url = getPreviewUrl({ host: options.host, port: options.port });
  log.success(`Preview production server starting at ${url}`);
  await runPreviewBuild(undefined, previewProject.cwd);
  const server = startPreviewServer({
    host: options.host,
    port: options.port,
    cwd: previewProject.cwd,
  });
  await waitForPreviewExit(server.process);
};
