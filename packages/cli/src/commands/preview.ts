import { access } from "node:fs/promises";
import { log } from "@clack/prompts";
import { prebuild } from "../prebuild";
import { LOCAL_DATA_FILE } from "../config";
import { HandledCliError } from "../errors";
import {
  getPreviewUrl,
  startPreviewDevServer,
  waitForPreviewExit,
} from "../preview-server";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { buildOptions } from "./build";

export const previewOptions = (yargs: CommonYargsArgv) =>
  buildOptions(yargs)
    .option("host", {
      type: "string",
      default: "127.0.0.1",
      describe: "Host used by the generated project dev server",
    })
    .option("port", {
      type: "number",
      default: 5173,
      describe: "Port used by the generated project dev server",
    })
    .option("generate", {
      type: "boolean",
      default: true,
      describe:
        "Regenerate project files from .webstudio/data.json before starting the dev server",
    })
    .example(
      "webstudio preview --template ssg --port 5173",
      "Regenerate files and start the generated site at http://127.0.0.1:5173"
    )
    .example(
      "webstudio preview --template react-router --generate false",
      "Start an already generated React Router app without rewriting project files"
    )
    .epilogue(
      [
        "Preview runs the generated app dev server; it does not install app dependencies.",
        "For a fresh checkout, copied fixture, or newly generated app, run npm install or pnpm install in the generated project before preview.",
        "If preview exits with a missing command/package such as react-router or vite, install the generated app dependencies and retry.",
      ].join("\n")
    );

type PreviewOptions = StrictYargsOptionsToInterface<typeof previewOptions>;

const isPositivePort = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 65535;

export const preview = async (options: PreviewOptions) => {
  if (options.host.length === 0) {
    throw new Error("--host must not be empty.");
  }
  if (isPositivePort(options.port) === false) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }
  try {
    await access(LOCAL_DATA_FILE);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      log.error(
        "You need to link and sync a Webstudio project before previewing it. Run `webstudio link` and `webstudio sync` first."
      );
      throw new HandledCliError();
    }
    throw error;
  }

  if (options.generate) {
    await prebuild({
      assets: options.assets,
      template: options.template,
    });
  }

  const url = getPreviewUrl({ host: options.host, port: options.port });
  log.success(`Preview server starting at ${url}`);
  const server = startPreviewDevServer({
    host: options.host,
    port: options.port,
  });
  await waitForPreviewExit(server.process);
};
