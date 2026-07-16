import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { Launcher } from "chrome-launcher";
import {
  defaultScreenshotTimeout,
  defaultScreenshotWaitForTimeout,
  defaultScreenshotWaitUntil,
  type ScreenshotBrowser,
  type ScreenshotWaitUntil,
} from "@webstudio-is/project-build/visual";
import {
  captureBrowserScreenshot,
  createBrowserScreenshotSession,
  defaultBrowserScreenshotDependencies,
  type BrowserScreenshotSession,
  type BrowserScreenshotDependencies,
  type BrowserScreenshotLayout,
  type BrowserScreenshotOptions,
} from "./screenshot-browser-cdp";

const execFileAsync = promisify(execFile);

export type BrowserCandidate = {
  path: string;
  source: "option" | "env" | "path" | "platform" | "chrome-launcher";
  browser: Exclude<ScreenshotBrowser, "auto">;
};

export class BrowserNotFoundError extends Error {
  readonly checked: readonly string[];

  constructor(checked: readonly string[]) {
    super("No supported Chromium browser was found.");
    this.name = "BrowserNotFoundError";
    this.checked = checked;
  }
}

export class BrowserInstallUnavailableError extends Error {
  constructor() {
    super("Chromium cannot be installed automatically on this system.");
    this.name = "BrowserInstallUnavailableError";
  }
}

export type ScreenshotDependencies = {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  access: (path: string, mode?: number) => Promise<void>;
  mkdir: (path: string, options: { recursive: true }) => Promise<unknown>;
  which: (command: string) => Promise<string | undefined>;
  getChromeLauncherInstallations: () => string[];
} & BrowserScreenshotDependencies & {
    captureBrowserScreenshot?: (
      options: BrowserScreenshotOptions
    ) => Promise<BrowserScreenshotLayout | undefined>;
    installCommand: (file: string, args: readonly string[]) => Promise<void>;
    getuid: () => number | undefined;
    now: () => number;
  };

export const defaultScreenshotDependencies: ScreenshotDependencies = {
  env: process.env,
  platform: process.platform,
  access,
  mkdir,
  async which(command) {
    const lookup = process.platform === "win32" ? "where" : "which";
    try {
      const { stdout } = await execFileAsync(lookup, [command]);
      return stdout.split(/\r?\n/).find((path) => path.length > 0);
    } catch {
      return undefined;
    }
  },
  getChromeLauncherInstallations() {
    try {
      return Launcher.getInstallations();
    } catch {
      return [];
    }
  },
  ...defaultBrowserScreenshotDependencies,
  async installCommand(file, args) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(file, [...args], { stdio: "inherit" });
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`${file} ${args.join(" ")} exited with code ${code}`));
      });
    });
  },
  getuid: () => process.getuid?.(),
  now: () => Date.now(),
};

export const chromiumDownloadUrl =
  "https://www.chromium.org/getting-involved/download-chromium/";

export const chromeDownloadUrl = "https://www.google.com/chrome/";

export const tesseractInstallUrl =
  "https://tesseract-ocr.github.io/tessdoc/Installation.html";

const pathCommandCandidates = [
  { command: "chromium", browser: "chromium" },
  { command: "chromium-browser", browser: "chromium" },
  { command: "google-chrome", browser: "chrome" },
  { command: "google-chrome-stable", browser: "chrome" },
  { command: "msedge", browser: "edge" },
  { command: "microsoft-edge", browser: "edge" },
  { command: "brave-browser", browser: "brave" },
  { command: "brave", browser: "brave" },
] as const;

const platformPathCandidates: Record<
  NodeJS.Platform,
  readonly BrowserCandidate[]
> = {
  aix: [],
  android: [],
  darwin: [
    {
      path: "/Applications/Chromium.app/Contents/MacOS/Chromium",
      source: "platform",
      browser: "chromium",
    },
    {
      path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      source: "platform",
      browser: "chrome",
    },
    {
      path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      source: "platform",
      browser: "edge",
    },
    {
      path: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      source: "platform",
      browser: "brave",
    },
  ],
  freebsd: [],
  haiku: [],
  linux: [
    { path: "/usr/bin/chromium", source: "platform", browser: "chromium" },
    {
      path: "/usr/bin/chromium-browser",
      source: "platform",
      browser: "chromium",
    },
    { path: "/usr/bin/google-chrome", source: "platform", browser: "chrome" },
    {
      path: "/usr/bin/google-chrome-stable",
      source: "platform",
      browser: "chrome",
    },
    { path: "/usr/bin/msedge", source: "platform", browser: "edge" },
    {
      path: "/usr/bin/microsoft-edge",
      source: "platform",
      browser: "edge",
    },
    { path: "/usr/bin/brave-browser", source: "platform", browser: "brave" },
  ],
  openbsd: [],
  sunos: [],
  win32: [
    {
      path: "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      source: "platform",
      browser: "chromium",
    },
    {
      path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      source: "platform",
      browser: "chrome",
    },
    {
      path: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      source: "platform",
      browser: "edge",
    },
    {
      path: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      source: "platform",
      browser: "brave",
    },
  ],
  cygwin: [],
  netbsd: [],
};

const browserPreference: Record<Exclude<ScreenshotBrowser, "auto">, number> = {
  chromium: 0,
  chrome: 1,
  edge: 2,
  brave: 3,
};

const inferBrowser = (path: string): Exclude<ScreenshotBrowser, "auto"> => {
  const normalized = path.toLowerCase();
  if (normalized.includes("chromium")) {
    return "chromium";
  }
  if (normalized.includes("edge") || normalized.includes("msedge")) {
    return "edge";
  }
  if (normalized.includes("brave")) {
    return "brave";
  }
  return "chrome";
};

const matchesBrowser = (
  candidate: BrowserCandidate,
  browser: ScreenshotBrowser
) => browser === "auto" || candidate.browser === browser;

const isExecutable = async (
  path: string,
  dependencies: ScreenshotDependencies
) => {
  try {
    await dependencies.access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const uniqueCandidates = (candidates: readonly BrowserCandidate[]) => {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.path)) {
      return false;
    }
    seen.add(candidate.path);
    return true;
  });
};

export const resolveScreenshotBrowser = async (
  options: {
    browser: ScreenshotBrowser;
    browserPath?: string;
  },
  dependencies = defaultScreenshotDependencies
): Promise<BrowserCandidate> => {
  const checked: string[] = [];
  const candidates: BrowserCandidate[] = [];

  if (options.browserPath !== undefined) {
    candidates.push({
      path: options.browserPath,
      source: "option",
      browser:
        options.browser === "auto"
          ? inferBrowser(options.browserPath)
          : options.browser,
    });
  }

  const envBrowserPath = dependencies.env.WEBSTUDIO_BROWSER_PATH;
  if (envBrowserPath !== undefined && envBrowserPath.length > 0) {
    candidates.push({
      path: envBrowserPath,
      source: "env",
      browser:
        options.browser === "auto"
          ? inferBrowser(envBrowserPath)
          : options.browser,
    });
  }

  for (const { command, browser } of pathCommandCandidates) {
    if (options.browser !== "auto" && options.browser !== browser) {
      continue;
    }
    const path = await dependencies.which(command);
    if (path !== undefined) {
      candidates.push({ path, source: "path", browser });
    }
  }

  candidates.push(
    ...(platformPathCandidates[dependencies.platform] ?? []).filter(
      (candidate) => matchesBrowser(candidate, options.browser)
    )
  );

  candidates.push(
    ...dependencies
      .getChromeLauncherInstallations()
      .map((path) => ({
        path,
        source: "chrome-launcher" as const,
        browser: inferBrowser(path),
      }))
      .filter((candidate) => matchesBrowser(candidate, options.browser))
      .sort(
        (left, right) =>
          browserPreference[left.browser] - browserPreference[right.browser]
      )
  );

  for (const candidate of uniqueCandidates(candidates)) {
    checked.push(candidate.path);
    if (await isExecutable(candidate.path, dependencies)) {
      return candidate;
    }
  }

  throw new BrowserNotFoundError(checked);
};

export const getNoBrowserFoundMessage = (checked: readonly string[]) =>
  [
    "No supported Chromium browser was found.",
    "",
    "Install Chromium and try again:",
    `- Chromium: ${chromiumDownloadUrl}`,
    `- Google Chrome: ${chromeDownloadUrl}`,
    "",
    "Or pass an explicit browser binary:",
    "- webstudio screenshot <url> --browser-path /path/to/chromium",
    "- WEBSTUDIO_BROWSER_PATH=/path/to/chromium webstudio screenshot <url>",
    "",
    checked.length === 0
      ? "No browser paths were found to check."
      : `Checked paths:\n${checked.map((path) => `- ${path}`).join("\n")}`,
  ].join("\n");

type InstallCommand = {
  command: string;
  args: readonly string[];
  label: string;
};

export type ChromiumInstallCommand = InstallCommand;

const getHomebrewOrAptInstallCommand = async (
  {
    brewArgs,
    aptPackage,
  }: {
    brewArgs: readonly string[];
    aptPackage: string;
  },
  dependencies = defaultScreenshotDependencies
): Promise<InstallCommand | undefined> => {
  if (dependencies.platform === "darwin") {
    if ((await dependencies.which("brew")) !== undefined) {
      return {
        command: "brew",
        args: brewArgs,
        label: `brew ${brewArgs.join(" ")}`,
      };
    }
    return undefined;
  }

  if (dependencies.platform !== "linux") {
    return undefined;
  }

  const isRoot = dependencies.getuid() === 0;
  const sudo = isRoot ? undefined : await dependencies.which("sudo");
  if (isRoot === false && sudo === undefined) {
    return undefined;
  }

  const getLinuxCommand = (packageManager: "apt" | "apt-get") => {
    const command = isRoot ? packageManager : "sudo";
    const args = isRoot
      ? ["install", "-y", aptPackage]
      : [packageManager, "install", "-y", aptPackage];
    return {
      command,
      args,
      label: `${command} ${args.join(" ")}`,
    };
  };

  if ((await dependencies.which("apt")) !== undefined) {
    return getLinuxCommand("apt");
  }

  if ((await dependencies.which("apt-get")) !== undefined) {
    return getLinuxCommand("apt-get");
  }

  return undefined;
};

export const getChromiumInstallCommand = async (
  dependencies = defaultScreenshotDependencies
): Promise<ChromiumInstallCommand | undefined> => {
  return getHomebrewOrAptInstallCommand(
    {
      brewArgs: ["install", "--cask", "chromium"],
      aptPackage: "chromium",
    },
    dependencies
  );
};

const getTesseractInstallCommand = async (
  dependencies = defaultScreenshotDependencies
): Promise<InstallCommand | undefined> => {
  return getHomebrewOrAptInstallCommand(
    {
      brewArgs: ["install", "tesseract"],
      aptPackage: "tesseract-ocr",
    },
    dependencies
  );
};

export const installTesseractForOcr = async (
  dependencies = defaultScreenshotDependencies
) => {
  const existing = await dependencies.which("tesseract");
  if (existing !== undefined) {
    return {
      installed: false,
      alreadyAvailable: true,
      command: undefined,
      tesseractPath: existing,
      installUrl: tesseractInstallUrl,
      warnings: [] as string[],
    };
  }
  const installCommand = await getTesseractInstallCommand(dependencies);
  if (installCommand === undefined) {
    return {
      installed: false,
      alreadyAvailable: false,
      command: undefined,
      tesseractPath: undefined,
      installUrl: tesseractInstallUrl,
      warnings: ["ocr_install_unavailable_on_this_system"],
    };
  }
  await dependencies.installCommand(
    installCommand.command,
    installCommand.args
  );
  const tesseractPath = await dependencies.which("tesseract");
  return {
    installed: true,
    alreadyAvailable: false,
    command: installCommand.label,
    tesseractPath,
    installUrl: tesseractInstallUrl,
    warnings:
      tesseractPath === undefined
        ? ["tesseract_not_found_after_install"]
        : ([] as string[]),
  };
};

export const shouldOfferBrowserInstall = ({
  isInteractive,
  isJson,
  isMcp,
  env,
}: {
  isInteractive: boolean;
  isJson: boolean;
  isMcp: boolean;
  env: NodeJS.ProcessEnv;
}) =>
  isInteractive === true &&
  isJson === false &&
  isMcp === false &&
  env.CI !== "true";

export const getScreenshotOutputPath = ({
  output,
  now,
  format = "png",
  suffix = "",
}: {
  output?: string;
  now: number;
  format?: "png" | "jpeg" | "webp";
  suffix?: string;
}) =>
  resolve(
    output ??
      `${tmpdir()}/webstudio-screenshot-${now}${suffix}.${format === "jpeg" ? "jpg" : format}`
  );

let screenshotBatchSequence = 0;

type CaptureScreenshotOptions = {
  url: string;
  output?: string;
  width: number;
  height: number;
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  includeContrastMetrics?: boolean;
  browser: ScreenshotBrowser;
  browserPath?: string;
  waitUntil?: ScreenshotWaitUntil;
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

const getBrowserScreenshotOptions = (
  options: CaptureScreenshotOptions,
  browserPath: string,
  output: string,
  dependencies: ScreenshotDependencies
): BrowserScreenshotOptions => ({
  browserPath,
  output,
  width: options.width,
  height: options.height,
  fullPage: options.fullPage,
  includeImageMetrics: options.includeImageMetrics,
  includeResourceMetrics: options.includeResourceMetrics,
  includeContrastMetrics: options.includeContrastMetrics,
  url: options.url,
  uid: dependencies.getuid(),
  waitUntil: options.waitUntil ?? defaultScreenshotWaitUntil,
  waitForSelector: options.waitForSelector,
  waitForTimeout: options.waitForTimeout ?? defaultScreenshotWaitForTimeout,
  timeout: options.timeout ?? defaultScreenshotTimeout,
  format: options.format,
  quality: options.quality,
  scale: options.scale,
});

const captureResolvedScreenshot = async (
  options: CaptureScreenshotOptions,
  browser: BrowserCandidate,
  dependencies: ScreenshotDependencies,
  browserSession?: BrowserScreenshotSession
) => {
  const startedAt = dependencies.now();
  const output = getScreenshotOutputPath({
    output: options.output,
    now: startedAt,
    format: options.format,
  });
  await dependencies.mkdir(dirname(output), { recursive: true });
  const browserScreenshotOptions = getBrowserScreenshotOptions(
    options,
    browser.path,
    output,
    dependencies
  );
  const layout =
    browserSession !== undefined
      ? await browserSession.capture(browserScreenshotOptions)
      : dependencies.captureBrowserScreenshot !== undefined
        ? await dependencies.captureBrowserScreenshot(browserScreenshotOptions)
        : await captureBrowserScreenshot(
            browserScreenshotOptions,
            dependencies
          );
  return {
    output,
    browser,
    viewport: {
      width: options.width,
      height: options.height,
    },
    fullPage: options.fullPage === true,
    elapsedMs: dependencies.now() - startedAt,
    warnings: [] as string[],
    ...(layout?.timings === undefined ? {} : { timings: layout.timings }),
    ...(layout?.navigation === undefined
      ? {}
      : { navigation: layout.navigation }),
    ...(layout === undefined ? {} : { layout }),
  };
};

export const captureScreenshot = async (
  options: CaptureScreenshotOptions,
  dependencies = defaultScreenshotDependencies
) => {
  const browser = await resolveScreenshotBrowser(options, dependencies);
  return await captureResolvedScreenshot(options, browser, dependencies);
};

export const createScreenshotCaptureSession = (
  dependencies = defaultScreenshotDependencies
) => {
  let browserPromise: Promise<BrowserCandidate> | undefined;
  let browserSession: BrowserScreenshotSession | undefined;
  let browserSessionPromise: Promise<BrowserScreenshotSession> | undefined;
  return {
    async capture(options: CaptureScreenshotOptions) {
      browserPromise ??= resolveScreenshotBrowser(options, dependencies);
      const resolvedBrowser = await browserPromise;
      if (
        (options.browserPath !== undefined &&
          options.browserPath !== resolvedBrowser.path) ||
        (options.browser !== "auto" &&
          options.browser !== resolvedBrowser.browser)
      ) {
        throw new Error(
          "A reusable screenshot session cannot switch browser executables."
        );
      }
      browserSessionPromise ??= createBrowserScreenshotSession(
        getBrowserScreenshotOptions(
          options,
          resolvedBrowser.path,
          options.output ?? "",
          dependencies
        ),
        dependencies
      );
      browserSession ??= await browserSessionPromise;
      return await captureResolvedScreenshot(
        options,
        resolvedBrowser,
        dependencies,
        browserSession
      );
    },
    async capturePage(optionsList: readonly CaptureScreenshotOptions[]) {
      const firstOptions = optionsList[0];
      if (firstOptions === undefined) {
        return [];
      }
      browserPromise ??= resolveScreenshotBrowser(firstOptions, dependencies);
      const resolvedBrowser = await browserPromise;
      if (
        optionsList.some(
          (options) =>
            (options.browserPath !== undefined &&
              options.browserPath !== resolvedBrowser.path) ||
            (options.browser !== "auto" &&
              options.browser !== resolvedBrowser.browser)
        )
      ) {
        throw new Error(
          "A reusable screenshot session cannot switch browser executables."
        );
      }
      const startedAt = dependencies.now();
      const batchSequence = screenshotBatchSequence;
      screenshotBatchSequence += 1;
      const captures = await Promise.all(
        optionsList.map(async (options, index) => {
          const output = getScreenshotOutputPath({
            output: options.output,
            now: startedAt,
            format: options.format,
            suffix: `-${batchSequence}-${index}`,
          });
          await dependencies.mkdir(dirname(output), { recursive: true });
          return {
            options,
            output,
            browserOptions: getBrowserScreenshotOptions(
              options,
              resolvedBrowser.path,
              output,
              dependencies
            ),
          };
        })
      );
      browserSessionPromise ??= createBrowserScreenshotSession(
        captures[0].browserOptions,
        dependencies
      );
      browserSession ??= await browserSessionPromise;
      const layouts = await browserSession.capturePage(
        captures.map((capture) => capture.browserOptions)
      );
      return captures.map(({ options, output }, index) => {
        const layout = layouts[index];
        if (layout === undefined) {
          throw new Error("Browser omitted a resized screenshot result.");
        }
        return {
          output,
          browser: resolvedBrowser,
          viewport: { width: options.width, height: options.height },
          fullPage: options.fullPage === true,
          elapsedMs: layout.timings?.wallMs ?? 0,
          warnings: [] as string[],
          ...(layout.timings === undefined ? {} : { timings: layout.timings }),
          ...(layout.navigation === undefined
            ? {}
            : { navigation: layout.navigation }),
          layout,
        };
      });
    },
    async close() {
      try {
        browserSession ??= await browserSessionPromise?.catch(() => undefined);
        await browserSession?.close();
      } finally {
        browserSession = undefined;
        browserSessionPromise = undefined;
        browserPromise = undefined;
      }
    },
  };
};

export const captureScreenshotWithBrowserInstall = async (
  options: {
    url: string;
    output?: string;
    width: number;
    height: number;
    fullPage?: boolean;
    includeImageMetrics?: boolean;
    includeResourceMetrics?: boolean;
    includeContrastMetrics?: boolean;
    browser: ScreenshotBrowser;
    browserPath?: string;
    waitUntil?: ScreenshotWaitUntil;
    waitForSelector?: string;
    waitForTimeout?: number;
    timeout?: number;
    isJson: boolean;
    isMcp: boolean;
    isInteractive: boolean;
    confirmInstall: (command: ChromiumInstallCommand) => Promise<boolean>;
  },
  dependencies = defaultScreenshotDependencies
) => {
  try {
    return await captureScreenshot(options, dependencies);
  } catch (error) {
    if (error instanceof BrowserNotFoundError === false) {
      throw error;
    }
    if (
      shouldOfferBrowserInstall({
        isInteractive: options.isInteractive,
        isJson: options.isJson,
        isMcp: options.isMcp,
        env: dependencies.env,
      }) === false
    ) {
      throw error;
    }
    const installCommand = await getChromiumInstallCommand(dependencies);
    if (installCommand === undefined) {
      throw new BrowserInstallUnavailableError();
    }
    if ((await options.confirmInstall(installCommand)) === false) {
      throw error;
    }
    await dependencies.installCommand(
      installCommand.command,
      installCommand.args
    );
    return captureScreenshot(options, dependencies);
  }
};
