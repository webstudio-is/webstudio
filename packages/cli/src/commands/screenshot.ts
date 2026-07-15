import { cancel, confirm, isCancel, log } from "@clack/prompts";
import {
  defaultScreenshotTimeout,
  defaultScreenshotWaitForTimeout,
  defaultScreenshotWaitUntil,
  isScreenshotWaitUntil,
  screenshotBrowserChoices,
  screenshotWaitUntilValues,
  type ScreenshotBrowser,
  type ScreenshotWaitUntil,
} from "@webstudio-is/project-build/visual";
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
import {
  preparePreviewProject,
  previewDefaultTemplate,
  validatePreviewServerOptions,
} from "./preview";
import { createPreviewController } from "../preview-server";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const screenshotOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("url", {
      type: "string",
      describe: "Absolute URL to capture",
    })
    .option("path", {
      type: "string",
      describe:
        "Project route to capture by generating a local production preview, for example /pricing",
    })
    .option("host", {
      type: "string",
      default: "127.0.0.1",
      describe: "Host used by the temporary project preview server",
    })
    .option("port", {
      type: "number",
      default: 5173,
      describe: "Port used by the temporary project preview server",
    })
    .option("image-domain", {
      type: "string",
      array: true,
      describe:
        "External image hostname allowed when --path starts a generated preview; repeat for multiple hosts",
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
    .option("full-page", {
      type: "boolean",
      default: false,
      describe:
        "Capture the full page height after layout instead of only the viewport.",
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
    .option("wait-until", {
      type: "string",
      choices: screenshotWaitUntilValues,
      default: defaultScreenshotWaitUntil,
      describe:
        "Page readiness event to wait for before capture. networkidle waits for the browser network idle lifecycle event.",
    })
    .option("wait-for-selector", {
      type: "string",
      describe: "CSS selector that must exist before capture.",
    })
    .option("wait-for-timeout", {
      type: "number",
      default: defaultScreenshotWaitForTimeout,
      describe:
        "Extra milliseconds to wait after page readiness, selector, fonts, and layout frames.",
    })
    .option("timeout", {
      type: "number",
      default: defaultScreenshotTimeout,
      describe: "Maximum milliseconds to wait for page readiness.",
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
  path?: string;
  browser?: ScreenshotBrowser;
  waitUntil?: ScreenshotWaitUntil;
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
};

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const printScreenshotError = ({
  code,
  message,
  json,
}: {
  code: "BROWSER_NOT_FOUND" | "BROWSER_INSTALL_UNAVAILABLE";
  message: string;
  json: boolean;
}) => {
  if (json) {
    printJson({
      ok: false,
      error: {
        code,
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

type ScreenshotCommandDependencies = {
  captureScreenshotWithBrowserInstall: typeof captureScreenshotWithBrowserInstall;
  preparePreviewProject?: typeof preparePreviewProject;
  createPreviewController?: (
    defaults: Parameters<typeof createPreviewController>[0]
  ) => Pick<
    ReturnType<typeof createPreviewController>,
    "startAndWait" | "stop" | "resolveUrl"
  >;
};

const defaultScreenshotCommandDependencies: ScreenshotCommandDependencies = {
  captureScreenshotWithBrowserInstall,
  preparePreviewProject,
  createPreviewController,
};

export const screenshot = async (
  rawOptions: unknown,
  dependencies = defaultScreenshotCommandDependencies
) => {
  const options = rawOptions as ScreenshotOptions;
  if (
    (options.url === undefined || options.url.length === 0) &&
    (options.path === undefined || options.path.length === 0)
  ) {
    throw new Error("Please specify a URL or project --path to capture.");
  }
  if (options.url !== undefined && options.path !== undefined) {
    throw new Error("Specify either a URL or --path, not both.");
  }
  if (
    options.path !== undefined &&
    (options.path.startsWith("/") === false || options.path.startsWith("//"))
  ) {
    throw new Error("--path must start with one slash, for example /pricing.");
  }
  if (isPositiveInteger(options.width) === false) {
    throw new Error("--width must be a positive integer.");
  }
  if (isPositiveInteger(options.height) === false) {
    throw new Error("--height must be a positive integer.");
  }
  if (
    options.waitUntil !== undefined &&
    isScreenshotWaitUntil(options.waitUntil) === false
  ) {
    throw new Error(
      "--wait-until must be commit, domcontentloaded, load, or networkidle."
    );
  }
  if (
    options.waitForTimeout !== undefined &&
    (Number.isInteger(options.waitForTimeout) === false ||
      options.waitForTimeout < 0)
  ) {
    throw new Error("--wait-for-timeout must be a non-negative integer.");
  }
  if (options.waitForSelector !== undefined && options.waitForSelector === "") {
    throw new Error("--wait-for-selector must not be empty.");
  }
  if (
    options.timeout !== undefined &&
    isPositiveInteger(options.timeout) === false
  ) {
    throw new Error("--timeout must be a positive integer.");
  }

  try {
    const capture = async (url: string) => {
      const result = await dependencies.captureScreenshotWithBrowserInstall({
        url,
        output: options.output,
        width: options.width,
        height: options.height,
        fullPage: options.fullPage,
        browser: options.browser ?? "auto",
        browserPath: options.browserPath,
        waitUntil: options.waitUntil ?? defaultScreenshotWaitUntil,
        waitForSelector: options.waitForSelector,
        waitForTimeout:
          options.waitForTimeout ?? defaultScreenshotWaitForTimeout,
        timeout: options.timeout ?? defaultScreenshotTimeout,
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

      if (
        options.path !== undefined &&
        result.navigation?.status !== undefined &&
        result.navigation.status >= 400
      ) {
        const message = `Generated preview returned HTTP ${result.navigation.status} for ${result.navigation.finalUrl}.`;
        if (options.json) {
          printJson({
            ok: false,
            error: {
              code: "SCREENSHOT_HTTP_ERROR",
              message,
            },
            data: {
              output: result.output,
              navigation: result.navigation,
            },
            meta: { command: "screenshot" },
          });
        } else {
          log.error(message);
        }
        throw new HandledCliError();
      }

      if (options.json) {
        printJson({
          ok: true,
          data: {
            output: result.output,
            browserPath: result.browser.path,
            browser: result.browser.browser,
            viewport: result.viewport,
            fullPage: result.fullPage,
            elapsedMs: result.elapsedMs,
            warnings: result.warnings,
            navigation: result.navigation,
            layout: result.layout,
          },
          meta: { command: "screenshot" },
        });
        return;
      }
      log.success(`Screenshot saved to ${result.output}`);
    };

    if (options.path === undefined) {
      await capture(options.url!);
      return;
    }

    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? 5173;
    validatePreviewServerOptions({
      host,
      port,
      imageDomains: options.imageDomain,
    });
    const previewProject = await (
      dependencies.preparePreviewProject ?? preparePreviewProject
    )({
      assets: true,
      template: [...previewDefaultTemplate],
      generate: true,
      silent: options.json,
    });
    const preview = (
      dependencies.createPreviewController ?? createPreviewController
    )({ host, port });
    try {
      await preview.startAndWait({
        cwd: previewProject.cwd,
        buildCacheKey: previewProject.buildCacheKey,
        host,
        port,
        imageDomains: options.imageDomain,
        restart: true,
      });
      await capture(preview.resolveUrl(options.path));
    } finally {
      await preview.stop();
    }
  } catch (error) {
    if (error instanceof BrowserNotFoundError) {
      printScreenshotError({
        code: "BROWSER_NOT_FOUND",
        message: getNoBrowserFoundMessage(error.checked),
        json: options.json,
      });
      throw new HandledCliError();
    }
    if (error instanceof BrowserInstallUnavailableError) {
      printScreenshotError({
        code: "BROWSER_INSTALL_UNAVAILABLE",
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
