import { constants } from "node:fs";
import { access, mkdir, open, readdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { Launcher } from "chrome-launcher";
import which from "which";
import {
  defaultBrowserStartupTimeout,
  defaultScreenshotTimeout,
  defaultScreenshotWaitForTimeout,
  defaultScreenshotWaitUntil,
  type ScreenshotBrowser,
  type ScreenshotWaitUntil,
} from "@webstudio-is/vision/browser";
import {
  BrowserStartupError,
  captureBrowserScreenshot,
  createBrowserScreenshotSession as createVisionBrowserScreenshotSession,
  defaultBrowserScreenshotDependencies,
  type BrowserScreenshotSession,
  type BrowserScreenshotDependencies,
  type BrowserScreenshotLayout,
  type BrowserScreenshotNavigation,
  type BrowserScreenshotOptions,
} from "@webstudio-is/vision/browser";

const webstudioPageInstrumentation = {
  pageMetadata: {
    rootMarkerAttribute: "data-ws-project",
    idAttribute: "data-ws-project",
    versionAttribute: "data-ws-version",
  },
  instanceIdAttribute: "data-ws-id",
} satisfies Pick<
  BrowserScreenshotOptions,
  "pageMetadata" | "instanceIdAttribute"
>;

const toWebstudioNavigation = ({
  pageMetadata,
  ...navigation
}: BrowserScreenshotNavigation) => ({
  ...navigation,
  generatedSiteRootPresent: pageMetadata?.rootMarkerPresent ?? false,
  ...(pageMetadata?.id === undefined ? {} : { projectId: pageMetadata.id }),
  ...(pageMetadata?.version === undefined
    ? {}
    : { projectVersion: pageMetadata.version }),
});

const toWebstudioLayout = ({
  navigation,
  ...layout
}: BrowserScreenshotLayout) => ({
  ...layout,
  ...(navigation === undefined
    ? {}
    : { navigation: toWebstudioNavigation(navigation) }),
});

export type BrowserCandidate = {
  path: string;
  source:
    | "option"
    | "env"
    | "path"
    | "platform"
    | "playwright"
    | "chrome-launcher";
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
  getPlaywrightInstallations: () => Promise<string[]>;
} & BrowserScreenshotDependencies & {
    captureBrowserScreenshot?: (
      options: BrowserScreenshotOptions
    ) => Promise<BrowserScreenshotLayout | undefined>;
    createBrowserScreenshotSession: typeof createVisionBrowserScreenshotSession;
    installCommand: (file: string, args: readonly string[]) => Promise<void>;
    readArtifactByte: (path: string) => Promise<number>;
    getuid: () => number | undefined;
    now: () => number;
  };

export const defaultScreenshotDependencies: ScreenshotDependencies = {
  env: process.env,
  platform: process.platform,
  access,
  mkdir,
  which: async (command) =>
    (await which(command, { nothrow: true })) ?? undefined,
  getChromeLauncherInstallations() {
    try {
      return Launcher.getInstallations();
    } catch {
      return [];
    }
  },
  getPlaywrightInstallations: () => getPlaywrightInstallations(),
  ...defaultBrowserScreenshotDependencies,
  createBrowserScreenshotSession: createVisionBrowserScreenshotSession,
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
  async readArtifactByte(path) {
    const file = await open(path, "r");
    try {
      const { bytesRead } = await file.read(new Uint8Array(1), 0, 1, 0);
      return bytesRead;
    } finally {
      await file.close();
    }
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

export const getPlaywrightInstallations = async ({
  env = process.env,
  platform = process.platform,
  homeDirectory = homedir(),
}: {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDirectory?: string;
} = {}) => {
  const configuredCache = env.PLAYWRIGHT_BROWSERS_PATH;
  const defaultCacheDirectory =
    platform === "darwin"
      ? join(homeDirectory, "Library", "Caches", "ms-playwright")
      : platform === "win32"
        ? join(
            env.LOCALAPPDATA ?? join(homeDirectory, "AppData", "Local"),
            "ms-playwright"
          )
        : join(
            env.XDG_CACHE_HOME ?? join(homeDirectory, ".cache"),
            "ms-playwright"
          );
  const cacheDirectory =
    configuredCache === undefined || configuredCache === ""
      ? defaultCacheDirectory
      : configuredCache === "0"
        ? undefined
        : resolve(configuredCache);
  if (cacheDirectory === undefined) {
    return [];
  }
  const entries = await readdir(cacheDirectory, { withFileTypes: true }).catch(
    () => []
  );
  const executablePaths =
    platform === "win32"
      ? [["chrome-win", "chrome.exe"]]
      : platform === "darwin"
        ? [
            ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
            [
              "chrome-mac-arm64",
              "Chromium.app",
              "Contents",
              "MacOS",
              "Chromium",
            ],
          ]
        : [
            ["chrome-linux64", "chrome"],
            ["chrome-linux", "chrome"],
          ];
  return entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("chromium-")
    )
    .flatMap((entry) =>
      executablePaths.map((segments) =>
        join(cacheDirectory, entry.name, ...segments)
      )
    );
};

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

const getScreenshotBrowserCandidates = async (
  options: {
    browser: ScreenshotBrowser;
    browserPath?: string;
  },
  dependencies: ScreenshotDependencies
) => {
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
    return candidates;
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

  if (options.browser === "auto" || options.browser === "chromium") {
    candidates.push(
      ...(await dependencies.getPlaywrightInstallations()).map((path) => ({
        path,
        source: "playwright" as const,
        browser: "chromium" as const,
      }))
    );
  }

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

  return uniqueCandidates(candidates);
};

const resolveScreenshotBrowserCandidate = async (
  options: {
    browser: ScreenshotBrowser;
    browserPath?: string;
  },
  dependencies: ScreenshotDependencies,
  excludedPaths: ReadonlySet<string>
): Promise<BrowserCandidate> => {
  const checked: string[] = [];
  for (const candidate of await getScreenshotBrowserCandidates(
    options,
    dependencies
  )) {
    if (excludedPaths.has(candidate.path)) {
      continue;
    }
    checked.push(candidate.path);
    if (await isExecutable(candidate.path, dependencies)) {
      return candidate;
    }
  }

  throw new BrowserNotFoundError(checked);
};

export const resolveScreenshotBrowser = async (
  options: {
    browser: ScreenshotBrowser;
    browserPath?: string;
  },
  dependencies = defaultScreenshotDependencies
): Promise<BrowserCandidate> =>
  await resolveScreenshotBrowserCandidate(options, dependencies, new Set());

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
  httpCredentials?: { username: string; password: string };
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
): BrowserScreenshotOptions => {
  const timeout = options.timeout ?? defaultScreenshotTimeout;
  return {
    browserPath,
    output,
    width: options.width,
    height: options.height,
    fullPage: options.fullPage,
    includeImageMetrics: options.includeImageMetrics,
    includeResourceMetrics: options.includeResourceMetrics,
    includeContrastMetrics: options.includeContrastMetrics,
    ...webstudioPageInstrumentation,
    url: options.url,
    httpCredentials: options.httpCredentials,
    uid: dependencies.getuid(),
    waitUntil: options.waitUntil ?? defaultScreenshotWaitUntil,
    waitForSelector: options.waitForSelector,
    waitForTimeout: options.waitForTimeout ?? defaultScreenshotWaitForTimeout,
    timeout,
    startupTimeout: Math.max(
      1,
      Math.min(defaultBrowserStartupTimeout, Math.floor(timeout / 2))
    ),
    format: options.format,
    quality: options.quality,
    scale: options.scale,
  };
};

const validateScreenshotArtifact = async (
  output: string,
  dependencies: ScreenshotDependencies
) => {
  let bytesRead: number;
  try {
    bytesRead = await dependencies.readArtifactByte(output);
  } catch (cause) {
    throw Object.assign(
      new Error(`Screenshot artifact is unreadable: ${output}`),
      { code: "SCREENSHOT_ARTIFACT_UNREADABLE", cause }
    );
  }
  if (bytesRead === 0) {
    throw Object.assign(new Error(`Screenshot artifact is empty: ${output}`), {
      code: "SCREENSHOT_ARTIFACT_EMPTY",
    });
  }
};

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
  const capturedLayout =
    browserSession !== undefined
      ? await browserSession.capture(browserScreenshotOptions)
      : dependencies.captureBrowserScreenshot !== undefined
        ? await dependencies.captureBrowserScreenshot(browserScreenshotOptions)
        : await captureBrowserScreenshot(
            browserScreenshotOptions,
            dependencies
          );
  const layout =
    capturedLayout === undefined
      ? undefined
      : toWebstudioLayout(capturedLayout);
  await validateScreenshotArtifact(output, dependencies);
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
) =>
  await withBrowserStartupFallback({
    options,
    dependencies,
    state: createBrowserStartupState(),
    attempt: async (browser) =>
      await captureResolvedScreenshot(options, browser, dependencies),
  });

const createBrowserStartupError = (
  failures: readonly { browser: BrowserCandidate; error: unknown }[]
) =>
  Object.assign(
    new BrowserStartupError(
      [
        "Unable to start any discovered Chromium-family browser.",
        ...failures.map(
          ({ browser, error }) =>
            `- ${browser.browser} (${browser.source}): ${browser.path}: ${error instanceof Error ? error.message : String(error)}`
        ),
      ].join("\n")
    ),
    {
      attempts: failures.map(({ browser }) => browser),
    }
  );

type BrowserStartupState = {
  failedPaths: Set<string>;
  failures: Array<{ browser: BrowserCandidate; error: unknown }>;
};

const createBrowserStartupState = (): BrowserStartupState => ({
  failedPaths: new Set(),
  failures: [],
});

const withBrowserStartupFallback = async <Result>({
  options,
  dependencies,
  state,
  attempt,
  validateBrowser,
  isCancelled = () => false,
}: {
  options: CaptureScreenshotOptions;
  dependencies: ScreenshotDependencies;
  state: BrowserStartupState;
  attempt: (browser: BrowserCandidate) => Promise<Result>;
  validateBrowser?: (browser: BrowserCandidate) => void;
  isCancelled?: () => boolean;
}): Promise<Result> => {
  while (true) {
    let browser: BrowserCandidate;
    try {
      browser = await resolveScreenshotBrowserCandidate(
        options,
        dependencies,
        state.failedPaths
      );
    } catch (error) {
      if (error instanceof BrowserNotFoundError && state.failures.length > 0) {
        throw createBrowserStartupError(state.failures);
      }
      throw error;
    }
    validateBrowser?.(browser);
    try {
      return await attempt(browser);
    } catch (error) {
      if (error instanceof BrowserStartupError === false || isCancelled()) {
        throw error;
      }
      if (state.failedPaths.has(browser.path) === false) {
        state.failures.push({ browser, error });
        state.failedPaths.add(browser.path);
      }
      if (options.browserPath !== undefined) {
        throw createBrowserStartupError(state.failures);
      }
    }
  }
};

export const createScreenshotCaptureSession = (
  dependencies = defaultScreenshotDependencies
) => {
  let browserSession: BrowserScreenshotSession | undefined;
  let browserSessionCandidate: BrowserCandidate | undefined;
  let browserSessionPromise: Promise<BrowserScreenshotSession> | undefined;
  let closePromise: Promise<void> | undefined;
  let closed = false;
  const startupState = createBrowserStartupState();
  const assertOpen = () => {
    if (closed) {
      throw new Error("Screenshot capture session is closed.");
    }
  };
  const getBrowserSession = async (
    options: BrowserScreenshotOptions
  ): Promise<BrowserScreenshotSession> => {
    assertOpen();
    if (browserSession !== undefined) {
      return browserSession;
    }
    const pendingSession =
      browserSessionPromise ??
      dependencies.createBrowserScreenshotSession(options, dependencies);
    browserSessionPromise = pendingSession;
    try {
      const session = await pendingSession;
      if (closed) {
        await session.close();
        throw new Error("Screenshot capture session is closed.");
      }
      browserSession = session;
      return session;
    } catch (error) {
      if (browserSessionPromise === pendingSession) {
        browserSessionPromise = undefined;
      }
      throw error;
    }
  };
  const getReadyBrowser = async (
    options: CaptureScreenshotOptions,
    compatibleOptions: readonly CaptureScreenshotOptions[] = [options]
  ) => {
    const validateBrowser = (browser: BrowserCandidate) => {
      if (
        compatibleOptions.some(
          (candidateOptions) =>
            (candidateOptions.browserPath !== undefined &&
              candidateOptions.browserPath !== browser.path) ||
            (candidateOptions.browser !== "auto" &&
              candidateOptions.browser !== browser.browser)
        )
      ) {
        throw new Error(
          "A reusable screenshot session cannot switch browser executables."
        );
      }
    };
    if (browserSession !== undefined && browserSessionCandidate !== undefined) {
      validateBrowser(browserSessionCandidate);
      return { browser: browserSessionCandidate, session: browserSession };
    }
    return await withBrowserStartupFallback({
      options,
      dependencies,
      state: startupState,
      validateBrowser,
      async attempt(browser) {
        const session = await getBrowserSession(
          getBrowserScreenshotOptions(
            options,
            browser.path,
            options.output ?? "",
            dependencies
          )
        );
        browserSessionCandidate = browser;
        return { browser, session };
      },
      isCancelled: () => closed,
    });
  };
  return {
    async capture(options: CaptureScreenshotOptions) {
      const { browser, session } = await getReadyBrowser(options);
      return await captureResolvedScreenshot(
        options,
        browser,
        dependencies,
        session
      );
    },
    async capturePage(optionsList: readonly CaptureScreenshotOptions[]) {
      assertOpen();
      const firstOptions = optionsList[0];
      if (firstOptions === undefined) {
        return [];
      }
      const { browser, session } = await getReadyBrowser(
        firstOptions,
        optionsList
      );
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
              browser.path,
              output,
              dependencies
            ),
          };
        })
      );
      const layouts = await session.capturePage(
        captures.map((capture) => capture.browserOptions)
      );
      await Promise.all(
        captures.map(({ output }) =>
          validateScreenshotArtifact(output, dependencies)
        )
      );
      return captures.map(({ options, output }, index) => {
        const capturedLayout = layouts[index];
        if (capturedLayout === undefined) {
          throw new Error("Browser omitted a resized screenshot result.");
        }
        const layout = toWebstudioLayout(capturedLayout);
        return {
          output,
          browser,
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
      closed = true;
      closePromise ??= (async () => {
        browserSession ??= await browserSessionPromise?.catch(() => undefined);
        await browserSession?.close();
      })();
      await closePromise;
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
