import { stdin, stdout } from "node:process";
import { readFile } from "node:fs/promises";
import {
  connectProjectSessionMcpServer,
  createMcpStdioTransport,
} from "@webstudio-is/project-build/mcp";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "@webstudio-is/project-build/contracts/namespaces";
import { diffPngFiles } from "@webstudio-is/project-build/visual/screenshot-diff";
import { publicApiOperations } from "@webstudio-is/protocol";
import { importProjectBundleWithAssets } from "@webstudio-is/http-client";
import { resolveApiConnection } from "../api-connection";
import { getStableErrorCode } from "../error-codes";
import { isHandledCliError } from "../errors";
import { loadJSONFile } from "../fs-utils";
import { createCliProjectSession } from "../project-session";
import { executeProjectSessionApiOperation } from "../project-session-api";
import { createPreviewController } from "../preview-server";
import {
  captureScreenshotWithBrowserInstall,
  installTesseractForOcr,
} from "../screenshot";
import {
  getVisionVerificationLoop,
  getVisionWorkflowSummary,
  visualVerificationRule,
} from "../mcp-guidance";
import { readCliDoc } from "../docs";
import { apiCompatibilityHeaders } from "./api";
import { importProject as importProjectCommand } from "./import";
import type { CommonYargsArgv } from "./yargs-types";

type StartableProjectSession = {
  initialize: () => Promise<unknown>;
  markStale: (namespaces: readonly BuilderNamespace[]) => Promise<unknown>;
};

export const prepareMcpProjectSession = async (
  session: StartableProjectSession
) => {
  await session.initialize();
  await session.markStale(builderNamespaces);
};

export const mcpOptions = (yargs: CommonYargsArgv) =>
  yargs
    .example(
      "$0 mcp",
      "Run a local MCP server over stdio for the configured Webstudio project"
    )
    .example(
      "MCP tool: meta.index",
      "Discover the concise capability catalog after the server starts"
    )
    .example(
      "MCP tool: meta.guide",
      "Ask for the recommended workflow and relevant tools"
    )
    .epilogue(readCliDoc("mcp-startup-epilogue"));

export const mcp = async () => {
  const connection = await resolveApiConnection();
  const apiConnection = {
    ...connection,
    headers: apiCompatibilityHeaders,
  };
  let importErrorMessage = "Project import failed.";
  const silentImportIndicator = {
    start: () => undefined,
    message: () => undefined,
    stop: (message?: string) => {
      if (message !== undefined) {
        importErrorMessage = message;
      }
    },
  };
  const session = createCliProjectSession({ connection: apiConnection });
  await prepareMcpProjectSession(session);
  const preview = createPreviewController({ host: "127.0.0.1", port: 5173 });
  await connectProjectSessionMcpServer({
    operations: publicApiOperations,
    createProjectSession: () => session,
    executeOperation: ({ command, input, dryRun }) =>
      executeProjectSessionApiOperation({
        command,
        input,
        connection: apiConnection,
        createProjectSession: () => session,
        dryRun,
      }),
    async importProject(input) {
      importErrorMessage = "Project import failed.";
      try {
        await importProjectCommand(
          {
            to: input.to,
            assetsDir: input.assetsDir,
            ignoreVersionCheck: input.ignoreVersionCheck,
            skipAssets: input.skipAssets,
          },
          {
            importProjectBundleWithAssets,
            loadJSONFile,
            readFile,
            text: async () => {
              throw new Error("MCP import requires to.");
            },
            isInteractive: false,
            log: { info: () => undefined },
            spinner: () => silentImportIndicator,
          }
        );
      } catch (error) {
        if (isHandledCliError(error)) {
          throw new Error(importErrorMessage);
        }
        throw error;
      }
      return { imported: true };
    },
    async startPreview(input) {
      return preview.startAndWait(input);
    },
    async getPreviewStatus() {
      return preview.status();
    },
    async captureScreenshot(input) {
      const url =
        input.url ??
        (input.path === undefined ? undefined : preview.resolveUrl(input.path));
      if (url === undefined) {
        throw new Error("MCP screenshot requires url or path.");
      }
      if (input.path !== undefined) {
        await preview.startAndWait();
      }
      const result = await captureScreenshotWithBrowserInstall({
        url,
        output: input.output,
        width: input.viewport.width,
        height: input.viewport.height,
        browser: input.browser,
        browserPath: input.browserPath,
        waitUntil: input.waitUntil,
        waitForSelector: input.waitForSelector,
        waitForTimeout: input.waitForTimeout,
        timeout: input.timeout,
        isJson: false,
        isMcp: true,
        isInteractive: false,
        confirmInstall: async () => false,
      });
      return {
        output: result.output,
        browserPath: result.browser.path,
        browser: result.browser.browser,
        viewport: result.viewport,
        elapsedMs: result.elapsedMs,
        warnings: result.warnings,
      };
    },
    async diffScreenshots(input) {
      return diffPngFiles(input);
    },
    async installOcr() {
      return installTesseractForOcr();
    },
    guidance: {
      visualVerificationRule,
      getVisionVerificationLoop,
      getVisionWorkflowSummary,
    },
    getErrorCode: getStableErrorCode,
    transport: await createMcpStdioTransport({ stdin, stdout }),
  });
};
