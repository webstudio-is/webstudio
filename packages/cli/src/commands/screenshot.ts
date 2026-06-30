import { cancel, confirm, isCancel, log } from "@clack/prompts";
import {
  screenshotBrowserChoices,
  type ScreenshotBrowser,
} from "@webstudio-is/project-build/visual/screenshot-browser";
import { printJson } from "../json-output";
import { HandledCliError } from "../errors";
import {
  BrowserInstallUnavailableError,
  BrowserNotFoundError,
  captureScreenshotWithBrowserInstall,
  chromeDownloadUrl,
  chromiumDownloadUrl,
  getNoBrowserFoundMessage,
} from "../screenshot";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const screenshotOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("url", {
      type: "string",
      describe: "URL to capture",
    })
    .option("output", {
      type: "string",
      alias: "o",
      describe:
        "PNG output path. Defaults to a webstudio-screenshot file in the system temp directory.",
    })
    .option("width", {
      type: "number",
      default: 1440,
      describe: "Viewport width in CSS pixels",
    })
    .option("height", {
      type: "number",
      default: 900,
      describe: "Viewport height in CSS pixels",
    })
    .option("browser", {
      type: "string",
      choices: screenshotBrowserChoices,
      default: "auto",
      describe:
        "Browser family to use. Auto prefers Chromium, then Chrome, Edge, and Brave.",
    })
    .option("browser-path", {
      type: "string",
      describe:
        "Explicit Chromium-family browser executable path. Also supported through WEBSTUDIO_BROWSER_PATH.",
    })
    .option("json", {
      type: "boolean",
      default: false,
      describe: "Print JSON output",
    });

type ScreenshotOptions = StrictYargsOptionsToInterface<
  typeof screenshotOptions
> & {
  url?: string;
  browser?: ScreenshotBrowser;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const printScreenshotError = ({
  message,
  json,
}: {
  message: string;
  json: boolean;
}) => {
  if (json) {
    printJson({
      ok: false,
      error: {
        code: "BROWSER_NOT_FOUND",
        message,
        fixes: [
          `Install Chromium: ${chromiumDownloadUrl}`,
          `Install Google Chrome: ${chromeDownloadUrl}`,
          "Pass --browser-path /path/to/chromium",
          "Set WEBSTUDIO_BROWSER_PATH=/path/to/chromium",
        ],
      },
      meta: { command: "screenshot" },
    });
    return;
  }
  log.error(message);
};

export const screenshot = async (rawOptions: unknown) => {
  const options = rawOptions as ScreenshotOptions;
  if (options.url === undefined || options.url.length === 0) {
    throw new Error("Please specify a URL to capture.");
  }
  if (isPositiveInteger(options.width) === false) {
    throw new Error("--width must be a positive integer.");
  }
  if (isPositiveInteger(options.height) === false) {
    throw new Error("--height must be a positive integer.");
  }

  try {
    const result = await captureScreenshotWithBrowserInstall({
      url: options.url,
      output: options.output,
      width: options.width,
      height: options.height,
      browser: options.browser ?? "auto",
      browserPath: options.browserPath,
      isJson: options.json,
      isMcp: false,
      isInteractive:
        process.stdin.isTTY === true && process.stdout.isTTY === true,
      async confirmInstall(installCommand) {
        const answer = await confirm({
          message: `No supported browser was found. Install Chromium now with "${installCommand.label}"?`,
          initialValue: true,
        });
        if (isCancel(answer)) {
          cancel("Screenshot capture is cancelled.");
          throw new HandledCliError();
        }
        return answer;
      },
    });

    if (options.json) {
      printJson({
        ok: true,
        data: {
          output: result.output,
          browserPath: result.browser.path,
          browser: result.browser.browser,
          viewport: result.viewport,
          elapsedMs: result.elapsedMs,
          warnings: result.warnings,
        },
        meta: { command: "screenshot" },
      });
      return;
    }
    log.success(`Screenshot saved to ${result.output}`);
  } catch (error) {
    if (error instanceof BrowserNotFoundError) {
      printScreenshotError({
        message: getNoBrowserFoundMessage(error.checked),
        json: options.json,
      });
      throw new HandledCliError();
    }
    if (error instanceof BrowserInstallUnavailableError) {
      printScreenshotError({
        message: [
          "No supported Chromium browser was found, and Webstudio cannot install Chromium automatically on this system.",
          "",
          "Install Chromium manually and try again:",
          `- Chromium: ${chromiumDownloadUrl}`,
          `- Google Chrome: ${chromeDownloadUrl}`,
          "",
          "Or pass --browser-path /path/to/chromium.",
        ].join("\n"),
        json: options.json,
      });
      throw new HandledCliError();
    }
    throw error;
  }
};
