import { stdin, stdout } from "node:process";
import {
  connectProjectSessionMcpServer,
  createMcpStdioTransport,
} from "@webstudio-is/project-build/mcp";
import { diffPngFiles } from "@webstudio-is/project-build/visual/screenshot-diff";
import { publicApiOperations } from "@webstudio-is/protocol";
import { resolveApiConnection } from "../api-connection";
import { getStableErrorCode } from "../error-codes";
import { createCliProjectSession } from "../project-session";
import { executeProjectSessionApiOperation } from "../project-session-api";
import { createPreviewController } from "../preview-server";
import { captureScreenshotWithBrowserInstall } from "../screenshot";
import {
  getVisionVerificationLoop,
  getVisionWorkflowSummary,
  visualVerificationRule,
} from "../mcp-guidance";
import { apiCompatibilityHeaders } from "./api";
import type { CommonYargsArgv } from "./yargs-types";

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
    .epilogue(
      [
        "Plain `webstudio mcp` starts the stdio MCP server.",
        "After startup, MCP clients discover capabilities with tools/list, resources/list, meta.index, meta.guide, and meta.get_more_tools.",
        "stdout is reserved for MCP JSON-RPC messages while the server is running.",
      ].join("\n")
    );

export const mcp = async () => {
  const connection = await resolveApiConnection();
  const apiConnection = {
    ...connection,
    headers: apiCompatibilityHeaders,
  };
  const session = createCliProjectSession({ connection: apiConnection });
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
    guidance: {
      visualVerificationRule,
      getVisionVerificationLoop,
      getVisionWorkflowSummary,
    },
    getErrorCode: getStableErrorCode,
    transport: await createMcpStdioTransport({ stdin, stdout }),
  });
};
