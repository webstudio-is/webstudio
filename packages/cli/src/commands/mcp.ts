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
  createLocalUploadAssetInput,
  createLocalUploadAssetsInput,
} from "../asset-files";
import {
  getVisionVerificationLoop,
  getVisionWorkflowSummary,
  visualVerificationRule,
} from "../mcp-guidance";
import { readCliDoc } from "../docs";
import { apiCompatibilityHeaders } from "./api";
import { importProject as importProjectCommand } from "./import";
import {
  preparePreviewProject,
  previewDefaultTemplate,
  validatePreviewServerOptions,
} from "./preview";
import type { CommonYargsArgv } from "./yargs-types";

type StartableProjectSession = {
  initialize: () => Promise<unknown>;
  markStale: (namespaces: readonly BuilderNamespace[]) => Promise<unknown>;
};

type McpPreviewController = Pick<
  ReturnType<typeof createPreviewController>,
  "startAndWait" | "status" | "resolveUrl"
>;

type McpPreviewInput = {
  host?: string;
  port?: number;
};

type CaptureScreenshotInput = Parameters<
  typeof captureScreenshotWithBrowserInstall
>[0];

type McpScreenshotInput = {
  url?: string;
  path?: string;
  output?: string;
  viewport: { width: number; height: number };
  browser?: CaptureScreenshotInput["browser"];
  browserPath?: string;
  waitUntil?: CaptureScreenshotInput["waitUntil"];
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
};

export const prepareMcpProjectSession = async (
  session: StartableProjectSession
) => {
  await session.initialize();
  await session.markStale(builderNamespaces);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const hasAssetName = (value: unknown): value is { name: string } =>
  isRecord(value) && typeof value.name === "string";

const getMcpUploadAssetInput = (input: unknown) => {
  if (isRecord(input) === false || hasAssetName(input.asset) === false) {
    throw new Error("upload-asset requires an asset object.");
  }
  return createLocalUploadAssetInput({
    asset: input.asset,
    assetsDir:
      typeof input.assetsDir === "string" ? input.assetsDir : undefined,
    readFile,
  });
};

const getMcpUploadAssetsInput = (input: unknown) => {
  if (
    isRecord(input) === false ||
    Array.isArray(input.assets) === false ||
    input.assets.every(hasAssetName) === false
  ) {
    throw new Error("upload-assets requires an assets array.");
  }
  return createLocalUploadAssetsInput({
    assets: input.assets,
    assetsDir:
      typeof input.assetsDir === "string" ? input.assetsDir : undefined,
    readFile,
  });
};

const getMcpOperationInput = (command: string, input: unknown) => {
  if (command === "upload-asset") {
    return getMcpUploadAssetInput(input);
  }
  if (command === "upload-assets") {
    return getMcpUploadAssetsInput(input);
  }
  return input;
};

const publicApiOperationByCommand = new Map<
  string,
  (typeof publicApiOperations)[number]
>(publicApiOperations.map((operation) => [operation.command, operation]));

const shouldInvalidatePreview = (command: string) =>
  publicApiOperationByCommand.get(command)?.method === "mutation";

const prepareDefaultPreviewProject = () =>
  preparePreviewProject({
    assets: true,
    template: [...previewDefaultTemplate],
    generate: true,
    syncIfMissing: true,
  });

const createMcpPreviewHandlers = ({
  preview,
  isStale = () => true,
  markFresh = () => undefined,
  preparePreview = prepareDefaultPreviewProject,
  captureScreenshot = captureScreenshotWithBrowserInstall,
}: {
  preview: McpPreviewController;
  isStale?: () => boolean;
  markFresh?: () => void;
  preparePreview?: typeof prepareDefaultPreviewProject;
  captureScreenshot?: typeof captureScreenshotWithBrowserInstall;
}) => ({
  async startPreview(input: McpPreviewInput) {
    validatePreviewServerOptions({
      host: input.host ?? "127.0.0.1",
      port: input.port ?? 5173,
    });
    const previewProject = await preparePreview();
    const result = await preview.startAndWait({
      ...input,
      cwd: previewProject.cwd,
      restart: true,
    });
    markFresh();
    return result;
  },
  async captureScreenshot(input: McpScreenshotInput) {
    let url = input.url;
    if (url === undefined) {
      if (input.path === undefined) {
        throw new Error("MCP screenshot requires url or path.");
      }
      if (preview.status().running === false || isStale()) {
        const previewProject = await preparePreview();
        await preview.startAndWait({
          cwd: previewProject.cwd,
          restart: true,
        });
        markFresh();
      }
      url = preview.resolveUrl(input.path);
    }
    return await captureScreenshot({
      url,
      output: input.output,
      width: input.viewport.width,
      height: input.viewport.height,
      browser: input.browser ?? "auto",
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
  },
});

export const __testing__ = {
  createMcpPreviewHandlers,
  getMcpOperationInput,
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
  let isPreviewStale = true;
  const markPreviewStale = () => {
    isPreviewStale = true;
  };
  const previewHandlers = createMcpPreviewHandlers({
    preview,
    isStale: () => isPreviewStale,
    markFresh: () => {
      isPreviewStale = false;
    },
  });
  await connectProjectSessionMcpServer({
    operations: publicApiOperations,
    createProjectSession: () => session,
    executeOperation: async ({ command, input, dryRun }) => {
      const result = await executeProjectSessionApiOperation({
        command,
        input: getMcpOperationInput(command, input),
        connection: apiConnection,
        createProjectSession: () => session,
        dryRun,
      });
      if (dryRun !== true && shouldInvalidatePreview(command)) {
        markPreviewStale();
      }
      return result;
    },
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
      markPreviewStale();
      return { imported: true };
    },
    startPreview: previewHandlers.startPreview,
    async getPreviewStatus() {
      return preview.status();
    },
    async captureScreenshot(input) {
      const result = await previewHandlers.captureScreenshot(input);
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
