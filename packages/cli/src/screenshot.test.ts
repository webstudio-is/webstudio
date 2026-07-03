import { describe, expect, test, vi } from "vitest";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import {
  BrowserNotFoundError,
  BrowserInstallUnavailableError,
  captureScreenshot,
  captureScreenshotWithBrowserInstall,
  getChromiumInstallCommand,
  getNoBrowserFoundMessage,
  installTesseractForOcr,
  resolveScreenshotBrowser,
  shouldOfferBrowserInstall,
  tesseractInstallUrl,
  type ScreenshotDependencies,
} from "./screenshot";

const createDependencies = (
  overrides: Partial<ScreenshotDependencies> = {}
): ScreenshotDependencies => ({
  env: {},
  platform: "linux",
  access: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
  which: vi.fn(async () => undefined),
  getChromeLauncherInstallations: vi.fn(() => []),
  spawnBrowser: vi.fn(() => ({
    kill: vi.fn(),
    once: vi.fn(),
  })),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdtemp: vi.fn(
    async () => "/tmp/webstudio-browser"
  ) as unknown as ScreenshotDependencies["mkdtemp"],
  rm: vi.fn(async () => undefined),
  fetch: vi.fn(),
  createWebSocket: vi.fn(),
  captureBrowserScreenshot: vi.fn(async () => undefined),
  installCommand: vi.fn(async () => undefined),
  getuid: vi.fn(() => 1000),
  now: vi.fn(() => 123),
  ...overrides,
});

describe("resolveScreenshotBrowser", () => {
  test("uses explicit browser path before discovered browsers", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "chromium" ? "/usr/bin/chromium" : undefined
      ),
    });

    await expect(
      resolveScreenshotBrowser(
        {
          browser: "auto",
          browserPath: "/custom/chromium",
        },
        dependencies
      )
    ).resolves.toEqual({
      path: "/custom/chromium",
      source: "option",
      browser: "chromium",
    });
    expect(dependencies.access).toHaveBeenCalledWith(
      "/custom/chromium",
      constants.X_OK
    );
    expect(dependencies.access).not.toHaveBeenCalledWith(
      "/usr/bin/chromium",
      constants.X_OK
    );
  });

  test("uses browser path from environment", async () => {
    const dependencies = createDependencies({
      env: { WEBSTUDIO_BROWSER_PATH: "/env/brave-browser" },
    });

    await expect(
      resolveScreenshotBrowser({ browser: "auto" }, dependencies)
    ).resolves.toEqual({
      path: "/env/brave-browser",
      source: "env",
      browser: "brave",
    });
  });

  test("prefers Chromium over Chrome and chrome-launcher fallback", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async (command) => {
        if (command === "chromium") {
          return "/usr/local/bin/chromium";
        }
        if (command === "google-chrome") {
          return "/usr/local/bin/google-chrome";
        }
        return undefined;
      }),
      getChromeLauncherInstallations: vi.fn(() => [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ]),
    });

    await expect(
      resolveScreenshotBrowser({ browser: "auto" }, dependencies)
    ).resolves.toEqual({
      path: "/usr/local/bin/chromium",
      source: "path",
      browser: "chromium",
    });
    expect(dependencies.access).toHaveBeenCalledWith(
      "/usr/local/bin/chromium",
      constants.X_OK
    );
  });

  test("throws with checked paths when no browser is executable", async () => {
    const dependencies = createDependencies({
      access: vi.fn(async () => {
        throw new Error("missing");
      }),
      which: vi.fn(async (command) =>
        command === "chromium" ? "/usr/bin/chromium" : undefined
      ),
      getChromeLauncherInstallations: vi.fn(() => ["/opt/google/chrome"]),
    });

    await expect(
      resolveScreenshotBrowser({ browser: "auto" }, dependencies)
    ).rejects.toMatchObject({
      checked: expect.arrayContaining([
        "/usr/bin/chromium",
        "/opt/google/chrome",
      ]),
    });
  });
});

describe("OCR installation", () => {
  test("does not install Tesseract when already available", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "tesseract" ? "/usr/bin/tesseract" : undefined
      ),
    });

    await expect(installTesseractForOcr(dependencies)).resolves.toEqual({
      installed: false,
      alreadyAvailable: true,
      command: undefined,
      tesseractPath: "/usr/bin/tesseract",
      installUrl: tesseractInstallUrl,
      warnings: [],
    });
    expect(dependencies.installCommand).not.toHaveBeenCalled();
  });

  test("installs Tesseract and verifies availability", async () => {
    let installed = false;
    const dependencies = createDependencies({
      which: vi.fn(async (command) => {
        if (command === "apt" || command === "sudo") {
          return `/usr/bin/${command}`;
        }
        if (command === "tesseract" && installed) {
          return "/usr/bin/tesseract";
        }
        return undefined;
      }),
      installCommand: vi.fn(async () => {
        installed = true;
      }),
    });

    await expect(installTesseractForOcr(dependencies)).resolves.toEqual({
      installed: true,
      alreadyAvailable: false,
      command: "sudo apt install -y tesseract-ocr",
      tesseractPath: "/usr/bin/tesseract",
      installUrl: tesseractInstallUrl,
      warnings: [],
    });
    expect(dependencies.installCommand).toHaveBeenCalledWith("sudo", [
      "apt",
      "install",
      "-y",
      "tesseract-ocr",
    ]);
  });

  test("returns actionable result when Tesseract cannot be installed automatically", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async () => undefined),
    });

    await expect(installTesseractForOcr(dependencies)).resolves.toEqual({
      installed: false,
      alreadyAvailable: false,
      command: undefined,
      tesseractPath: undefined,
      installUrl: tesseractInstallUrl,
      warnings: ["ocr_install_unavailable_on_this_system"],
    });
  });
});

test("formats actionable browser installation guidance", () => {
  expect(getNoBrowserFoundMessage(["/usr/bin/chromium"])).toContain(
    "No supported Chromium browser was found."
  );
  expect(getNoBrowserFoundMessage(["/usr/bin/chromium"])).toContain(
    "https://www.chromium.org/getting-involved/download-chromium/"
  );
  expect(getNoBrowserFoundMessage(["/usr/bin/chromium"])).toContain(
    "--browser-path"
  );
  expect(getNoBrowserFoundMessage(["/usr/bin/chromium"])).toContain(
    "WEBSTUDIO_BROWSER_PATH"
  );
});

describe("captureScreenshot", () => {
  test("captures with browser readiness defaults", async () => {
    const captureBrowserScreenshot = vi.fn(async () => undefined);
    const output = `${tmpdir()}/webstudio-screenshot-123.png`;
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "chromium" ? "/usr/bin/chromium" : undefined
      ),
      captureBrowserScreenshot,
    });

    await expect(
      captureScreenshot(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
        },
        dependencies
      )
    ).resolves.toMatchObject({
      output: expect.stringContaining("webstudio-screenshot-123.png"),
      browser: { path: "/usr/bin/chromium", browser: "chromium" },
      viewport: { width: 1440, height: 900 },
      elapsedMs: 0,
      warnings: [],
    });
    expect(captureBrowserScreenshot).toHaveBeenCalledWith({
      browserPath: "/usr/bin/chromium",
      output,
      width: 1440,
      height: 900,
      url: "https://example.com",
      uid: 1000,
      waitUntil: "load",
      waitForSelector: undefined,
      waitForTimeout: 250,
      timeout: 30000,
    });
    expect(dependencies.mkdir).toHaveBeenCalledWith(tmpdir(), {
      recursive: true,
    });
  });

  test("passes explicit readiness options to browser capture", async () => {
    const captureBrowserScreenshot = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "chromium" ? "/usr/bin/chromium" : undefined
      ),
      captureBrowserScreenshot,
    });

    await captureScreenshot(
      {
        url: "https://example.com",
        width: 1440,
        height: 900,
        browser: "auto",
        waitUntil: "networkidle",
        waitForSelector: "#ready",
        waitForTimeout: 500,
        timeout: 10_000,
      },
      dependencies
    );

    expect(captureBrowserScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        waitUntil: "networkidle",
        waitForSelector: "#ready",
        waitForTimeout: 500,
        timeout: 10_000,
      })
    );
  });

  test("creates the output directory before launching the browser", async () => {
    const mkdir = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "chromium" ? "/usr/bin/chromium" : undefined
      ),
      mkdir,
    });

    await captureScreenshot(
      {
        url: "https://example.com",
        output: "nested/current.png",
        width: 1440,
        height: 900,
        browser: "auto",
      },
      dependencies
    );

    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("nested"), {
      recursive: true,
    });
  });
});

describe("browser installation", () => {
  test("does not offer install in json, mcp, ci, or non-interactive contexts", () => {
    expect(
      shouldOfferBrowserInstall({
        isInteractive: true,
        isJson: true,
        isMcp: false,
        env: {},
      })
    ).toBe(false);
    expect(
      shouldOfferBrowserInstall({
        isInteractive: true,
        isJson: false,
        isMcp: true,
        env: {},
      })
    ).toBe(false);
    expect(
      shouldOfferBrowserInstall({
        isInteractive: true,
        isJson: false,
        isMcp: false,
        env: { CI: "true" },
      })
    ).toBe(false);
    expect(
      shouldOfferBrowserInstall({
        isInteractive: false,
        isJson: false,
        isMcp: false,
        env: {},
      })
    ).toBe(false);
  });

  test("returns platform install command for Chromium", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "apt" || command === "sudo"
          ? `/usr/bin/${command}`
          : undefined
      ),
    });

    await expect(getChromiumInstallCommand(dependencies)).resolves.toEqual({
      command: "sudo",
      args: ["apt", "install", "-y", "chromium"],
      label: "sudo apt install -y chromium",
    });
  });

  test("does not offer Linux install command without sudo for non-root users", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async (command) =>
        command === "apt" ? "/usr/bin/apt" : undefined
      ),
    });

    await expect(getChromiumInstallCommand(dependencies)).resolves.toBe(
      undefined
    );
  });

  test("uses root apt command without sudo", async () => {
    const dependencies = createDependencies({
      getuid: vi.fn(() => 0),
      which: vi.fn(async (command) =>
        command === "apt" ? "/usr/bin/apt" : undefined
      ),
    });

    await expect(getChromiumInstallCommand(dependencies)).resolves.toEqual({
      command: "apt",
      args: ["install", "-y", "chromium"],
      label: "apt install -y chromium",
    });
  });

  test("uses apt-get when apt is unavailable", async () => {
    const dependencies = createDependencies({
      which: vi.fn(async (command) => {
        if (command === "sudo") {
          return "/usr/bin/sudo";
        }
        if (command === "apt-get") {
          return "/usr/bin/apt-get";
        }
        return undefined;
      }),
    });

    await expect(getChromiumInstallCommand(dependencies)).resolves.toEqual({
      command: "sudo",
      args: ["apt-get", "install", "-y", "chromium"],
      label: "sudo apt-get install -y chromium",
    });
  });

  test("uses Homebrew install command on macOS", async () => {
    const dependencies = createDependencies({
      platform: "darwin",
      which: vi.fn(async (command) =>
        command === "brew" ? "/opt/homebrew/bin/brew" : undefined
      ),
    });

    await expect(getChromiumInstallCommand(dependencies)).resolves.toEqual({
      command: "brew",
      args: ["install", "--cask", "chromium"],
      label: "brew install --cask chromium",
    });
  });

  test("installs Chromium after confirmation and retries capture", async () => {
    let installed = false;
    const installCommand = vi.fn(async () => {
      installed = true;
    });
    const captureBrowserScreenshot = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      access: vi.fn(async (path) => {
        if (path.startsWith("/usr/bin/") && installed === false) {
          throw new Error("missing");
        }
      }),
      which: vi.fn(async (command) => {
        if (command === "apt") {
          return "/usr/bin/apt";
        }
        if (command === "sudo") {
          return "/usr/bin/sudo";
        }
        if (command === "chromium") {
          return "/usr/bin/chromium";
        }
        return undefined;
      }),
      captureBrowserScreenshot,
      installCommand,
    });
    const confirmInstall = vi.fn(async () => true);

    await expect(
      captureScreenshotWithBrowserInstall(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
          isJson: false,
          isMcp: false,
          isInteractive: true,
          confirmInstall,
        },
        dependencies
      )
    ).resolves.toMatchObject({
      browser: { path: "/usr/bin/chromium" },
    });
    expect(confirmInstall).toHaveBeenCalledOnce();
    expect(installCommand).toHaveBeenCalledWith("sudo", [
      "apt",
      "install",
      "-y",
      "chromium",
    ]);
    expect(captureBrowserScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        browserPath: "/usr/bin/chromium",
        url: "https://example.com",
      })
    );
  });

  test("keeps original browser-not-found error when install is declined", async () => {
    const dependencies = createDependencies({
      access: vi.fn(async () => {
        throw new Error("missing");
      }),
      which: vi.fn(async (command) => {
        if (command === "apt") {
          return "/usr/bin/apt";
        }
        if (command === "sudo") {
          return "/usr/bin/sudo";
        }
        return undefined;
      }),
    });

    await expect(
      captureScreenshotWithBrowserInstall(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
          isJson: false,
          isMcp: false,
          isInteractive: true,
          confirmInstall: vi.fn(async () => false),
        },
        dependencies
      )
    ).rejects.toBeInstanceOf(BrowserNotFoundError);
    expect(dependencies.installCommand).not.toHaveBeenCalled();
  });

  test("propagates install confirmation errors", async () => {
    const expectedError = new Error("cancelled");
    const dependencies = createDependencies({
      access: vi.fn(async () => {
        throw new Error("missing");
      }),
      which: vi.fn(async (command) => {
        if (command === "apt") {
          return "/usr/bin/apt";
        }
        if (command === "sudo") {
          return "/usr/bin/sudo";
        }
        return undefined;
      }),
    });

    await expect(
      captureScreenshotWithBrowserInstall(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
          isJson: false,
          isMcp: false,
          isInteractive: true,
          confirmInstall: vi.fn(async () => {
            throw expectedError;
          }),
        },
        dependencies
      )
    ).rejects.toBe(expectedError);
  });

  test("rethrows browser not found when install is not allowed", async () => {
    const dependencies = createDependencies({
      access: vi.fn(async () => {
        throw new Error("missing");
      }),
    });

    await expect(
      captureScreenshotWithBrowserInstall(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
          isJson: true,
          isMcp: false,
          isInteractive: true,
          confirmInstall: vi.fn(async () => true),
        },
        dependencies
      )
    ).rejects.toBeInstanceOf(BrowserNotFoundError);
  });

  test("reports unavailable browser auto-install separately", async () => {
    const dependencies = createDependencies({
      access: vi.fn(async () => {
        throw new Error("missing");
      }),
      which: vi.fn(async () => undefined),
    });

    await expect(
      captureScreenshotWithBrowserInstall(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
          isJson: false,
          isMcp: false,
          isInteractive: true,
          confirmInstall: vi.fn(async () => true),
        },
        dependencies
      )
    ).rejects.toBeInstanceOf(BrowserInstallUnavailableError);
    expect(dependencies.installCommand).not.toHaveBeenCalled();
  });

  test("rethrows browser not found when install succeeds but rediscovery fails", async () => {
    const dependencies = createDependencies({
      access: vi.fn(async () => {
        throw new Error("missing");
      }),
      which: vi.fn(async (command) => {
        if (command === "apt") {
          return "/usr/bin/apt";
        }
        if (command === "sudo") {
          return "/usr/bin/sudo";
        }
        if (command === "chromium") {
          return "/usr/bin/chromium";
        }
        return undefined;
      }),
    });

    await expect(
      captureScreenshotWithBrowserInstall(
        {
          url: "https://example.com",
          width: 1440,
          height: 900,
          browser: "auto",
          isJson: false,
          isMcp: false,
          isInteractive: true,
          confirmInstall: vi.fn(async () => true),
        },
        dependencies
      )
    ).rejects.toBeInstanceOf(BrowserNotFoundError);
    expect(dependencies.installCommand).toHaveBeenCalledWith("sudo", [
      "apt",
      "install",
      "-y",
      "chromium",
    ]);
  });
});
