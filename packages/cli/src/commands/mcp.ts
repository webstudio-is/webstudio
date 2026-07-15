import { cwd, stdin, stdout, stderr } from "node:process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  connectProjectSessionMcpServer,
  createProjectSessionMcpCore,
  createMcpStdioTransport,
} from "@webstudio-is/project-build/mcp";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts";
import { diffPngFiles } from "@webstudio-is/project-build/visual";
import {
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
} from "@webstudio-is/protocol";
import { importProjectBundleWithAssets } from "@webstudio-is/http-client";
import packageJson from "../../package.json" with { type: "json" };
import type { ProjectSessionSnapshot } from "@webstudio-is/project-build/project-session";
import type { SemanticValidationIssue } from "@webstudio-is/project-build/runtime";
import { resolveApiConnection } from "../api-connection";
import {
  getCliErrorIssues,
  getCliErrorMessage,
  getCliErrorSummary,
  getStableErrorCode,
  isMissingApiAccessError,
} from "../error-codes";
import { HandledCliError, isHandledCliError } from "../errors";
import { loadJSONFile } from "../fs-utils";
import {
  assertCliServerOperationSupported,
  createCliProjectSession,
  getCliServerApiContract,
  getSupportedPublicApiOperations,
  type CliServerApiContract,
  writeCliProjectSessionDataFile,
} from "../project-session";
import { executeProjectSessionApiOperation } from "../project-session-api";
import { createPreviewController } from "../preview-server";
import {
  captureScreenshotWithBrowserInstall,
  createScreenshotCaptureSession,
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
import { printJson } from "../json-output";
import { apiCompatibilityHeaders } from "./api";
import { importProject as importProjectCommand } from "./import";
import {
  preparePreviewProject,
  previewDefaultTemplate,
  type PreviewSource,
  validatePreviewServerOptions,
} from "./preview";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

type StartableProjectSession = {
  snapshot: ProjectSessionSnapshot | undefined;
  initialize: () => Promise<unknown>;
  markStale: (namespaces: readonly BuilderNamespace[]) => Promise<unknown>;
};

type McpPreviewController = Pick<
  ReturnType<typeof createPreviewController>,
  "startAndWait" | "status" | "resolveUrl"
> &
  Partial<Pick<ReturnType<typeof createPreviewController>, "stop">>;

type McpPreviewInput = {
  host?: string;
  port?: number;
  source?: PreviewSource;
  imageDomains?: string[];
};

type CaptureScreenshotInput = Parameters<
  typeof captureScreenshotWithBrowserInstall
>[0];

type McpScreenshotInput = {
  url?: string;
  baseUrl?: string;
  path?: string;
  output?: string;
  host?: string;
  port?: number;
  imageDomains?: string[];
  viewport: { width: number; height: number };
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  browser?: CaptureScreenshotInput["browser"];
  browserPath?: string;
  waitUntil?: CaptureScreenshotInput["waitUntil"];
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
  source?: PreviewSource;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

type McpToolProgress = {
  report: (message: string) => void;
};

type PublicApiCommand = (typeof publicApiOperations)[number]["command"];
type CliMcpHost = Parameters<
  typeof createProjectSessionMcpCore<PublicApiCommand>
>[0];

type McpRunCall = {
  tool: string;
  input: unknown;
  dryRun: boolean;
};

export const prepareMcpProjectSession = async (
  session: StartableProjectSession
) => {
  await session.initialize();
};

const mcpStatusPrefix = "[webstudio mcp]";
const mcpCheckpointFile = ".webstudio/mcp-checkpoint.json";
const renderedAuditArtifactDirectory = ".webstudio/audits";

export const formatMcpStatusLine = (message: string) =>
  `${mcpStatusPrefix} ${message}`;

export const createMcpStatusReporter = (
  write: (line: string) => void = (line) => {
    stderr.write(`${line}\n`);
  },
  projectRoot = cwd()
) => ({
  starting() {
    write(formatMcpStatusLine(`starting stdio server from ${projectRoot}`));
  },
  sessionReady() {
    write(
      formatMcpStatusLine(
        "project session initialized; existing local snapshot preserved"
      )
    );
  },
  ready(toolCount: number) {
    write(
      formatMcpStatusLine(
        `ready with ${toolCount} tools; use tools/list, meta.index, or webstudio://project/guide; waiting for JSON-RPC on stdin`
      )
    );
  },
  apiContract(contract: CliServerApiContract) {
    const serverVersion = contract.serverVersion ?? "legacy/unavailable";
    const unavailable = contract.missingServerOperationIds.join(", ") || "none";
    write(
      formatMcpStatusLine(
        `API contract negotiated: CLI ${packageJson.version} (${contract.clientVersion}); server ${serverVersion}; unavailable server procedures: ${unavailable}`
      )
    );
  },
  connectionClosed() {
    write(
      formatMcpStatusLine(
        `lifecycle ${JSON.stringify({ event: "stdio_connection_closed", recovery: "Reconnect the MCP client if this was unexpected." })}`
      )
    );
  },
  connectionError(error: Error) {
    write(
      formatMcpStatusLine(
        `lifecycle ${JSON.stringify({ event: "stdio_transport_error", message: getCliErrorMessage(error), recovery: "Reconnect the MCP client. If the error repeats, restart the CLI with npx webstudio@latest mcp." })}`
      )
    );
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const createMcpInputError = (message: string, code: string) =>
  Object.assign(new Error(message), { code });

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

type PersistedMcpCheckpoint = {
  tool: string;
  message: string;
  nextCommand?: string;
};

const getMcpCheckpointPath = (projectRoot = cwd()) =>
  path.join(projectRoot, mcpCheckpointFile);

const readPersistedMcpCheckpoint = async (projectRoot = cwd()) => {
  try {
    return JSON.parse(
      await readFile(getMcpCheckpointPath(projectRoot), "utf8")
    ) as PersistedMcpCheckpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
};

const writePersistedMcpCheckpoint = async (
  checkpoint: PersistedMcpCheckpoint,
  projectRoot = cwd()
) => {
  const checkpointPath = getMcpCheckpointPath(projectRoot);
  await mkdir(path.dirname(checkpointPath), { recursive: true });
  await writeFile(checkpointPath, JSON.stringify(checkpoint, undefined, 2));
};

const clearPersistedMcpCheckpoint = async (projectRoot = cwd()) => {
  await rm(getMcpCheckpointPath(projectRoot), { force: true });
};

const assertPersistedMcpCheckpointAcknowledged = async (
  tool: string,
  projectRoot = cwd()
) => {
  if (tool === "checkpoint.ack") {
    return;
  }
  const checkpoint = await readPersistedMcpCheckpoint(projectRoot);
  if (checkpoint === undefined) {
    return;
  }
  throw createMcpInputError(
    `CHECKPOINT_REQUIRED: ${checkpoint.message} Stop now and report the previous checkpoint to the parent/user. Only after the parent/user continues, call checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"} before calling "${tool}".`,
    "CHECKPOINT_REQUIRED"
  );
};

const getResultCheckpoint = (tool: string, structuredContent: unknown) => {
  if (isRecord(structuredContent) === false) {
    return;
  }
  const data = structuredContent.data;
  if (isRecord(data) === false) {
    return;
  }
  const checkpoint = data.checkpoint;
  if (
    isRecord(checkpoint) &&
    checkpoint.required === true &&
    typeof checkpoint.instruction === "string"
  ) {
    return {
      tool,
      message: checkpoint.instruction,
      nextCommand:
        typeof checkpoint.nextCommand === "string"
          ? checkpoint.nextCommand
          : undefined,
    };
  }
};

const updatePersistedMcpCheckpoint = async ({
  tool,
  structuredContent,
  projectRoot = cwd(),
}: {
  tool: string;
  structuredContent: unknown;
  projectRoot?: string;
}) => {
  if (tool === "checkpoint.ack") {
    await clearPersistedMcpCheckpoint(projectRoot);
    return;
  }
  const checkpoint = getResultCheckpoint(tool, structuredContent);
  if (checkpoint !== undefined) {
    await writePersistedMcpCheckpoint(checkpoint, projectRoot);
  }
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

const prepareDefaultPreviewProject = (
  source: PreviewSource = "local",
  prepareSessionDataFile?: () => Promise<void>
) =>
  preparePreviewProject({
    assets: true,
    template: [...previewDefaultTemplate],
    generate: true,
    source,
    syncIfMissing: true,
    silent: true,
    prepareSessionDataFile,
  });

const getLoadedProjectSessionSnapshot = (session: StartableProjectSession) => {
  const snapshot = session.snapshot;
  if (snapshot === undefined) {
    throw new Error(
      "Project session snapshot is not loaded. Run a project-session command such as status or refresh before previewing from session."
    );
  }
  return snapshot;
};

const createMcpPreviewHandlers = ({
  preview,
  isStale = () => true,
  markFresh = () => undefined,
  preparePreview = prepareDefaultPreviewProject,
  prepareSessionDataFile,
  captureScreenshot = captureScreenshotWithBrowserInstall,
  createCaptureSession,
}: {
  preview: McpPreviewController;
  isStale?: () => boolean;
  markFresh?: () => void;
  preparePreview?: typeof prepareDefaultPreviewProject;
  prepareSessionDataFile?: () => Promise<void>;
  captureScreenshot?: typeof captureScreenshotWithBrowserInstall;
  createCaptureSession?: typeof createScreenshotCaptureSession;
}) => {
  let captureSession:
    | ReturnType<typeof createScreenshotCaptureSession>
    | undefined;
  const closeCaptureSession = async () => {
    try {
      await captureSession?.close();
    } finally {
      captureSession = undefined;
    }
  };
  const rejectBuilderUrl = (value: string) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return;
    }
    const isProjectHost =
      url.hostname.startsWith("p-") &&
      (url.hostname.endsWith(".wstd.dev") ||
        url.hostname.endsWith(".apps.webstudio.is"));
    if (
      isProjectHost &&
      url.searchParams.has("authToken") &&
      url.searchParams.has("mode")
    ) {
      throw Object.assign(
        new Error(
          "This is an authenticated Builder/share URL, not a generated-site preview. Use the share URL with webstudio init --link, then capture a generated route with screenshot { path }, or pass an intentional standalone site URL without Builder authentication parameters."
        ),
        { code: "BUILDER_URL_IS_NOT_SITE_PREVIEW" }
      );
    }
  };
  const resolveScreenshotUrl = async (
    input: McpScreenshotInput,
    progress?: McpToolProgress
  ) => {
    if (input.url !== undefined) {
      rejectBuilderUrl(input.url);
      return input.url;
    }
    if (input.path === undefined) {
      throw new Error("MCP screenshot requires url or path.");
    }
    if (input.baseUrl !== undefined) {
      rejectBuilderUrl(input.baseUrl);
      return new URL(input.path, input.baseUrl).toString();
    }
    const hasExplicitPreviewTarget =
      input.host !== undefined || input.port !== undefined;
    if (
      preview.status().running === false ||
      isStale() ||
      hasExplicitPreviewTarget
    ) {
      await closeCaptureSession();
      validatePreviewServerOptions({
        host: input.host ?? "127.0.0.1",
        port: input.port ?? 5173,
        imageDomains: input.imageDomains,
      });
      progress?.report("tool screenshot preparing generated preview project");
      const previewProject = await preparePreview(
        input.source,
        prepareSessionDataFile
      );
      progress?.report("tool screenshot starting production preview server");
      await preview.startAndWait({
        cwd: previewProject.cwd,
        buildCacheKey: previewProject.buildCacheKey,
        host: input.host,
        port: input.port,
        imageDomains: input.imageDomains,
        restart: true,
      });
      markFresh();
    }
    return preview.resolveUrl(input.path);
  };
  const getCaptureOptions = (input: McpScreenshotInput, url: string) => ({
    url,
    output: input.output,
    width: input.viewport.width,
    height: input.viewport.height,
    fullPage: input.fullPage,
    includeImageMetrics: input.includeImageMetrics,
    includeResourceMetrics: input.includeResourceMetrics,
    browser: input.browser ?? "auto",
    browserPath: input.browserPath,
    waitUntil: input.waitUntil,
    waitForSelector: input.waitForSelector,
    waitForTimeout: input.waitForTimeout,
    timeout: input.timeout,
    format: input.format,
    quality: input.quality,
    scale: input.scale,
  });
  return {
    async startPreview(input: McpPreviewInput, progress?: McpToolProgress) {
      await closeCaptureSession();
      validatePreviewServerOptions({
        host: input.host ?? "127.0.0.1",
        port: input.port ?? 5173,
        imageDomains: input.imageDomains,
      });
      progress?.report(
        "tool preview.start preparing generated preview project"
      );
      const previewProject = await preparePreview(
        input.source,
        prepareSessionDataFile
      );
      progress?.report("tool preview.start starting production preview server");
      const result = await preview.startAndWait({
        ...input,
        cwd: previewProject.cwd,
        buildCacheKey: previewProject.buildCacheKey,
        restart: true,
      });
      markFresh();
      return result;
    },
    async captureScreenshot(
      input: McpScreenshotInput,
      progress?: McpToolProgress
    ) {
      const url = await resolveScreenshotUrl(input, progress);
      progress?.report(`tool screenshot capturing ${url}`);
      const captureOptions = getCaptureOptions(input, url);
      if (input.source === "session" && createCaptureSession !== undefined) {
        captureSession ??= createCaptureSession();
        return await captureSession.capture(captureOptions);
      }
      return await captureScreenshot({
        ...captureOptions,
        isJson: false,
        isMcp: true,
        isInteractive: false,
        confirmInstall: async () => false,
      });
    },
    async capturePageScreenshots(
      inputs: readonly McpScreenshotInput[],
      progress?: McpToolProgress
    ) {
      const firstInput = inputs[0];
      if (firstInput === undefined) {
        return [];
      }
      if (
        createCaptureSession === undefined ||
        firstInput.source !== "session" ||
        inputs.some((input) => input.source !== firstInput.source)
      ) {
        throw new Error(
          "Resized screenshot capture requires session preview pages."
        );
      }
      const urls: string[] = [];
      for (const input of inputs) {
        urls.push(await resolveScreenshotUrl(input, progress));
      }
      progress?.report(
        `tool screenshot capturing ${new Set(urls).size} pages across ${inputs.length} viewport widths`
      );
      captureSession ??= createCaptureSession();
      return await captureSession.capturePage(
        inputs.map((input, index) => {
          const url = urls[index];
          if (url === undefined) {
            throw new Error("Screenshot URL resolution was incomplete.");
          }
          return getCaptureOptions(input, url);
        })
      );
    },
    async stopPreview() {
      const errors: unknown[] = [];
      try {
        await closeCaptureSession();
      } catch (error) {
        errors.push(error);
      }
      let result;
      try {
        if (preview.stop === undefined) {
          throw new Error("Preview controller cannot stop its owned preview.");
        }
        result = await preview.stop();
      } catch (error) {
        errors.push(error);
      }
      if (errors.length === 1) {
        throw errors[0];
      }
      if (errors.length > 1) {
        throw new AggregateError(
          errors,
          "Could not clean up screenshot capture or stop the owned preview."
        );
      }
      if (result === undefined) {
        throw new Error("Preview controller did not return its stopped state.");
      }
      return result;
    },
  };
};

export const mcpOptions = (yargs: CommonYargsArgv) =>
  yargs
    .command(
      ["list-tools"],
      "Print the concise MCP tool catalog as JSON",
      mcpListToolsOptions,
      mcpListTools
    )
    .command(
      ["list-resources"],
      "List the MCP resources available for the configured project",
      mcpListResourcesOptions,
      mcpListResources
    )
    .command(
      ["read-resource <uri>"],
      "Read one MCP resource by URI",
      mcpReadResourceOptions,
      mcpReadResource
    )
    .command(
      ["single-op-call <tool> [input]"],
      "Call one MCP tool in a fresh CLI process for debugging",
      mcpSingleOpCallOptions,
      mcpSingleOpCall
    )
    .command(
      ["run <input>"],
      "Run multiple MCP tool calls in one shared CLI session from JSON or a file",
      mcpRunOptions,
      mcpRun
    )
    .example(
      "$0 mcp",
      "Run a local MCP server over stdio for the configured Webstudio project"
    )
    .example(
      "$0 mcp single-op-call meta.index",
      "Debug one MCP tool without writing a stdio client script"
    )
    .example("$0 mcp list-tools", "Print the concise MCP tool catalog")
    .example("$0 mcp list-resources", "List available MCP resources")
    .example(
      "$0 mcp read-resource webstudio://project/guide",
      "Read the project MCP guide"
    )
    .example(
      '$0 mcp run \'[{"tool":"components.search","input":{"brief":"button"}}]\'',
      "Run a small multi-step MCP workflow from inline JSON"
    )
    .example(
      "$0 mcp run .temp/mcp-calls.json",
      "Run a larger bounded multi-step MCP workflow from a file"
    )
    .example(
      '$0 mcp single-op-call components.search \'{"brief":"radix select"}\'',
      "Pass a JSON argument object to one MCP tool"
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

const mcpListToolsOptions = (yargs: CommonYargsArgv) =>
  yargs.option("json", {
    type: "boolean",
    describe: "Accepted for compatibility. The MCP tool catalog is always JSON",
    default: false,
  });

type McpListToolsOptions = StrictYargsOptionsToInterface<
  typeof mcpListToolsOptions
>;

const mcpListResourcesOptions = (yargs: CommonYargsArgv) =>
  yargs.option("json", {
    type: "boolean",
    describe: "Accepted for compatibility. MCP resource output is always JSON",
    default: false,
  });

type McpListResourcesOptions = StrictYargsOptionsToInterface<
  typeof mcpListResourcesOptions
>;

const mcpReadResourceOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("uri", {
      type: "string",
      describe: "MCP resource URI, for example webstudio://project/guide",
      demandOption: true,
    })
    .option("json", {
      type: "boolean",
      describe:
        "Accepted for compatibility. MCP resource output is always JSON",
      default: false,
    });

type McpReadResourceOptions = StrictYargsOptionsToInterface<
  typeof mcpReadResourceOptions
> & { uri?: string };

const mcpSingleOpCallOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("tool", {
      type: "string",
      describe: "MCP tool name, for example meta.index or insert-fragment",
      demandOption: true,
    })
    .positional("input", {
      type: "string",
      describe: "JSON argument object for the MCP tool",
    })
    .option("input-file", {
      type: "string",
      describe: "Path to a JSON file containing the MCP tool argument object",
    })
    .option("dry-run", {
      type: "boolean",
      describe: "Run local-capable mutation tools without committing",
      default: false,
    })
    .option("json", {
      type: "boolean",
      describe:
        "Accepted for compatibility. MCP single-op-call output is always JSON",
      default: false,
    });

type McpSingleOpCallOptions = {
  tool?: string;
  input?: string;
  inputFile?: string | undefined;
  dryRun?: boolean;
  refresh?: boolean;
  json?: boolean;
  printSuccess?: (data: unknown) => void;
};

const mcpRunOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("input", {
      type: "string",
      describe:
        'Inline JSON or path to a JSON file containing { "calls": [{ "tool": "...", "input": {} }] }',
      demandOption: true,
    })
    .option("dry-run", {
      type: "boolean",
      describe: "Run local-capable mutation tools without committing",
      default: false,
    })
    .option("json", {
      type: "boolean",
      describe: "Accepted for compatibility. MCP run output is always JSON",
      default: false,
    });

type McpRunOptions = StrictYargsOptionsToInterface<typeof mcpRunOptions> & {
  input?: string;
};

const parseMcpSingleOpCallInput = async ({
  input,
  inputFile,
}: Partial<Pick<McpSingleOpCallOptions, "input" | "inputFile">>) => {
  if (input !== undefined && inputFile !== undefined) {
    throw new Error("Use either input or --input-file, not both.");
  }
  const source =
    inputFile === undefined ? input : await readFile(inputFile, "utf8");
  if (source === undefined || source.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw createMcpInputError(
      `MCP single-op-call input must be valid JSON. ${
        error instanceof Error ? error.message : String(error)
      }`,
      "INVALID_JSON"
    );
  }
};

const parseMcpRunCalls = (value: unknown): McpRunCall[] => {
  const calls = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.calls)
      ? value.calls
      : undefined;
  if (calls === undefined) {
    throw new Error(
      'MCP run input must be an array of calls or an object with a "calls" array.'
    );
  }
  if (calls.length === 0) {
    throw new Error("MCP run input must include at least one call.");
  }
  return calls.map((call, index): McpRunCall => {
    if (isRecord(call) === false) {
      throw new Error(`MCP run calls[${index}] must be an object.`);
    }
    if (typeof call.tool !== "string" || call.tool.length === 0) {
      throw new Error(
        `MCP run calls[${index}].tool must be a non-empty string.`
      );
    }
    return {
      tool: call.tool,
      input: call.input ?? {},
      dryRun: call.dryRun === true || call["dry-run"] === true,
    };
  });
};

const parseMcpRunInput = async (input: string | undefined) => {
  if (input === undefined || input.length === 0) {
    throw new Error("mcp run requires inline JSON or an input file.");
  }
  const trimmedInput = input.trim();
  if (trimmedInput.startsWith("{") || trimmedInput.startsWith("[")) {
    try {
      return parseMcpRunCalls(JSON.parse(trimmedInput));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw createMcpInputError(
          `MCP run inline input must be valid JSON. ${error.message}`,
          "INVALID_JSON"
        );
      }
      throw error;
    }
  }
  const inputPath = path.resolve(cwd(), input);
  try {
    return parseMcpRunCalls(JSON.parse(await readFile(inputPath, "utf8")));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createMcpInputError(
        `MCP run input file must be valid JSON at ${inputPath}. ${error.message}`,
        "INVALID_JSON"
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      throw new Error(
        `MCP run input file was not found. Resolved path: ${inputPath}. Current working directory: ${cwd()}. Create the JSON file under this project root or pass an absolute path.`
      );
    }
    throw error;
  }
};

const applyMcpRunOptions = (
  calls: McpRunCall[],
  options: Pick<McpRunOptions, "dryRun">
) => {
  if (options.dryRun !== true) {
    return calls;
  }
  return calls.map((call) => ({ ...call, dryRun: true }));
};

const createMcpRunCheckpointStopPayload = ({
  checkpoint,
  completedCalls,
  totalCalls,
  results,
  elapsedMs,
}: {
  checkpoint: PersistedMcpCheckpoint;
  completedCalls: number;
  totalCalls: number;
  results: unknown[];
  elapsedMs: number;
}) => {
  const error = {
    code: "CHECKPOINT_REQUIRED",
    message: `${checkpoint.message} Stop now and report the previous checkpoint to the parent/user. Only after the parent/user continues, call checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"} before continuing this run.`,
  };
  return {
    ok: false,
    error,
    data: {
      completedCalls,
      stoppedAfterCall: completedCalls,
      totalCalls,
      results,
    },
    meta: {
      elapsedMs,
    },
  };
};

const getMcpRunError = (error: unknown) => {
  const issues = getCliErrorIssues(error);
  if (
    isRecord(error) &&
    typeof error.message === "string" &&
    (error.code === undefined || typeof error.code === "string")
  ) {
    return {
      code: isMissingApiAccessError(error)
        ? "UNAUTHORIZED"
        : (error.code ?? "MCP_TOOL_FAILED"),
      message: getCliErrorSummary(error),
      ...(issues === undefined ? {} : { issues }),
    };
  }
  const code = isMissingApiAccessError(error)
    ? "UNAUTHORIZED"
    : (getStableErrorCode(error) ?? "MCP_TOOL_FAILED");
  const message = getCliErrorSummary(error);
  return { code, message, ...(issues === undefined ? {} : { issues }) };
};

const validateSingleOpCallInput = (tool: string, input: unknown) => {
  if (tool !== "audit" || isRecord(input) === false) {
    return;
  }
  const issues: SemanticValidationIssue[] = [];
  if (input.pageId !== undefined && input.pagePath !== undefined) {
    issues.push({
      path: ["pagePath"],
      code: "mutually_exclusive_fields",
      message: "pageId and pagePath are mutually exclusive.",
      constraint: "use_page_id_or_page_path",
      example: "/pricing",
    });
  }
  if (input.rendered === true && input.cursor !== undefined) {
    issues.push({
      path: ["cursor"],
      code: "incompatible_fields",
      message: "cursor cannot be combined with rendered audit.",
      constraint: "omit_cursor_for_rendered_audit",
    });
  }
  if (issues.length > 0) {
    throw Object.assign(new Error("Audit input is invalid."), {
      code: "INVALID_INPUT",
      issues,
    });
  }
};

const createMcpSingleOpCallErrorPayload = ({
  error,
  elapsedMs,
}: {
  error: unknown;
  elapsedMs: number;
}) => ({
  ok: false,
  error: getMcpRunError(error),
  meta: {
    elapsedMs,
  },
});

const createMcpRunErrorPayload = ({
  error,
  completedCalls,
  failedCall,
  totalCalls,
  results,
  elapsedMs,
}: {
  error: unknown;
  completedCalls: number;
  failedCall?: number;
  totalCalls: number;
  results: unknown[];
  elapsedMs: number;
}) => ({
  ok: false,
  error: getMcpRunError(error),
  data: {
    completedCalls,
    ...(failedCall === undefined ? {} : { failedCall }),
    totalCalls,
    results,
  },
  meta: {
    elapsedMs,
  },
});

const reportMcpRunPreflightFailure = ({
  error,
  startedAt,
  totalCalls,
}: {
  error: unknown;
  startedAt: number;
  totalCalls: number;
}) => {
  const payload = createMcpRunErrorPayload({
    error,
    completedCalls: 0,
    totalCalls,
    results: [],
    elapsedMs: Date.now() - startedAt,
  });
  stderr.write(
    `${formatMcpStatusLine(
      `run failed before executing calls: ${payload.error.message}`
    )}\n`
  );
  printJson(payload);
};

const isMcpToolCallFailure = (result: {
  isError?: boolean;
  structuredContent: { ok?: boolean };
}) => result.isError === true || result.structuredContent.ok === false;

const getMcpToolCallError = (result: {
  isError?: boolean;
  structuredContent: { ok?: boolean; error?: unknown };
}) => {
  if (isMcpToolCallFailure(result) === false) {
    return;
  }
  return isRecord(result.structuredContent.error)
    ? result.structuredContent.error
    : { code: "MCP_TOOL_FAILED", message: "MCP tool call failed." };
};

const assertSingleOpCallToolSupported = (tool: string) => {
  if (tool === "preview.start") {
    throw Object.assign(
      new Error(
        'preview.start is long-lived and cannot be used with mcp single-op-call. Use webstudio mcp run \'{"calls":[{"tool":"preview.start","input":{"source":"session"}},{"tool":"screenshot","input":{"path":"/","output":"current.png","viewport":{"width":1440,"height":900}}},{"tool":"preview.stop","input":{}}]}\' for one shared shell process, start a long-running webstudio mcp server, or use webstudio preview.'
      ),
      { code: "BAD_REQUEST" }
    );
  }
  if (tool === "preview.stop") {
    throw Object.assign(
      new Error(
        "preview.stop can only stop a preview owned by the same long-running MCP server or webstudio mcp run process. It cannot stop a preview started by another mcp single-op-call process."
      ),
      { code: "BAD_REQUEST" }
    );
  }
};

export const __testing__ = {
  createMcpPreviewHandlers,
  createMcpStatusReporter,
  formatMcpStatusLine,
  assertSingleOpCallToolSupported,
  assertPersistedMcpCheckpointAcknowledged,
  clearPersistedMcpCheckpoint,
  createMcpSingleOpCallErrorPayload,
  createMcpResourceErrorPayload: (error: unknown, elapsedMs: number) => ({
    ok: false,
    error: {
      code: getStableErrorCode(error) ?? "MCP_RESOURCE_FAILED",
      message: error instanceof Error ? error.message : String(error),
    },
    meta: { elapsedMs },
  }),
  createMcpRunErrorPayload,
  createMcpRunCheckpointStopPayload,
  getLoadedProjectSessionSnapshot,
  getResultCheckpoint,
  getMcpOperationInput,
  parseMcpSingleOpCallInput,
  validateSingleOpCallInput,
  isMcpToolCallFailure,
  getMcpToolCallError,
  applyMcpRunOptions,
  parseMcpRunCalls,
  parseMcpRunInput,
  readPersistedMcpCheckpoint,
  updatePersistedMcpCheckpoint,
};

const createCliMcpHost = async () => {
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
  const apiContract = await getCliServerApiContract(apiConnection);
  const operations = getSupportedPublicApiOperations(apiContract);
  const session = createCliProjectSession({ connection: apiConnection });
  await prepareMcpProjectSession(session);
  const preview = createPreviewController({ host: "127.0.0.1", port: 5173 });
  let isPreviewStale = true;
  const markPreviewStale = () => {
    isPreviewStale = true;
  };
  const previewHandlers = createMcpPreviewHandlers({
    preview,
    createCaptureSession: createScreenshotCaptureSession,
    isStale: () => isPreviewStale,
    markFresh: () => {
      isPreviewStale = false;
    },
    prepareSessionDataFile: async () => {
      await writeCliProjectSessionDataFile(
        getLoadedProjectSessionSnapshot(session),
        undefined,
        { origin: connection.origin }
      );
    },
  });
  const toProjectSessionScreenshotResult = (
    result: Awaited<ReturnType<typeof previewHandlers.captureScreenshot>>
  ) => ({
    output: result.output,
    browserPath: result.browser.path,
    browser: result.browser.browser,
    viewport: result.viewport,
    fullPage: result.fullPage,
    elapsedMs: result.elapsedMs,
    warnings: result.warnings,
    navigation: result.navigation,
    layout: result.layout,
    timings: result.timings,
  });
  const host: CliMcpHost = {
    operations,
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
      return { imported: true as const };
    },
    startPreview: previewHandlers.startPreview,
    async getPreviewStatus() {
      return preview.status();
    },
    stopPreview: previewHandlers.stopPreview,
    async captureScreenshot(input) {
      const result = await previewHandlers.captureScreenshot(input);
      return toProjectSessionScreenshotResult(result);
    },
    async capturePageScreenshots(inputs) {
      const results = await previewHandlers.capturePageScreenshots(inputs);
      return results.map(toProjectSessionScreenshotResult);
    },
    async diffScreenshots(input) {
      return diffPngFiles(input);
    },
    async installOcr() {
      return installTesseractForOcr();
    },
    async storeRenderedAuditArtifacts(manifest) {
      const directory = path.join(cwd(), renderedAuditArtifactDirectory);
      await mkdir(directory, { recursive: true });
      const artifactPath = path.join(
        directory,
        `rendered-${manifest.projectId}-${manifest.projectVersion}.json`
      );
      await writeFile(
        artifactPath,
        JSON.stringify(manifest, undefined, 2),
        "utf8"
      );
      return artifactPath;
    },
    guidance: {
      visualVerificationRule,
      getVisionVerificationLoop,
      getVisionWorkflowSummary,
    },
  };
  return {
    session,
    host,
    apiContract,
    toolCount: operations.length,
    reportLog(message: string) {
      if (message.startsWith("ready with ")) {
        return;
      }
      stderr.write(`${formatMcpStatusLine(message)}\n`);
    },
  };
};

export const mcpSingleOpCall = async (options: McpSingleOpCallOptions) => {
  if (options.tool === undefined || options.tool === "") {
    throw new Error("mcp single-op-call requires a tool name.");
  }
  const startedAt = Date.now();
  stderr.write(
    `${formatMcpStatusLine(
      `single-op-call ${options.tool} started${options.dryRun === true ? " (dry run)" : ""}`
    )}\n`
  );
  try {
    assertSingleOpCallToolSupported(options.tool);
    const input = await parseMcpSingleOpCallInput(options);
    validateSingleOpCallInput(options.tool, input);
    const { host, apiContract } = await createCliMcpHost();
    const operation = publicApiOperations.find(
      (candidate) => candidate.command === options.tool
    );
    if (
      operation !== undefined &&
      publicApiOperationRequiresServerSupport(operation)
    ) {
      assertCliServerOperationSupported(operation.id, apiContract);
    }
    const core = createProjectSessionMcpCore(host);
    const persistedCheckpoint =
      options.tool === "checkpoint.ack"
        ? await readPersistedMcpCheckpoint()
        : undefined;
    await assertPersistedMcpCheckpointAcknowledged(options.tool);
    if (options.refresh === true && options.tool !== "refresh") {
      await core.callTool({ name: "refresh" });
    }
    const result = await core.callTool({
      name: options.tool,
      input,
      dryRun: options.dryRun,
    });
    if (isMcpToolCallFailure(result)) {
      stderr.write(
        `${formatMcpStatusLine(
          `single-op-call ${options.tool} failed in ${Date.now() - startedAt}ms`
        )}\n`
      );
      printJson(result.structuredContent);
      throw new HandledCliError();
    }
    if (
      options.tool === "checkpoint.ack" &&
      persistedCheckpoint?.nextCommand !== undefined &&
      isRecord(result.structuredContent.data)
    ) {
      result.structuredContent.data.nextCommand =
        persistedCheckpoint.nextCommand;
    }
    await updatePersistedMcpCheckpoint({
      tool: options.tool,
      structuredContent: result.structuredContent,
    });
    const session = result.structuredContent.meta.session;
    const committed =
      session === undefined ? "" : `; committed=${session.committed}`;
    stderr.write(
      `${formatMcpStatusLine(
        `single-op-call ${options.tool} succeeded in ${Date.now() - startedAt}ms${committed}`
      )}\n`
    );
    if (options.printSuccess === undefined) {
      printJson(result.structuredContent);
    } else {
      options.printSuccess(result.structuredContent.data);
    }
  } catch (error) {
    if (isHandledCliError(error)) {
      throw error;
    }
    const payload = createMcpSingleOpCallErrorPayload({
      error,
      elapsedMs: Date.now() - startedAt,
    });
    stderr.write(
      `${formatMcpStatusLine(
        `single-op-call ${options.tool} failed in ${payload.meta.elapsedMs}ms: ${payload.error.message}`
      )}\n`
    );
    printJson(payload);
    throw new HandledCliError();
  }
};

class McpRunCheckpointStop extends Error {}

export const mcpRun = async (options: McpRunOptions) => {
  const startedAt = Date.now();
  let calls: McpRunCall[];
  try {
    calls = await parseMcpRunInput(options.input);
  } catch (error) {
    reportMcpRunPreflightFailure({
      error,
      startedAt,
      totalCalls: 0,
    });
    throw new HandledCliError();
  }
  calls = applyMcpRunOptions(calls, options);
  stderr.write(
    `${formatMcpStatusLine(
      `run started with ${calls.length} calls in one shared session`
    )}\n`
  );
  const results: unknown[] = [];
  let core: ReturnType<typeof createProjectSessionMcpCore<PublicApiCommand>>;
  try {
    const { host, apiContract } = await createCliMcpHost();
    for (const call of calls) {
      const operation = publicApiOperations.find(
        (candidate) => candidate.command === call.tool
      );
      if (
        operation !== undefined &&
        publicApiOperationRequiresServerSupport(operation)
      ) {
        assertCliServerOperationSupported(operation.id, apiContract);
      }
    }
    core = createProjectSessionMcpCore(host);
    if (calls.length > 0) {
      await assertPersistedMcpCheckpointAcknowledged(calls[0]!.tool);
    }
  } catch (error) {
    reportMcpRunPreflightFailure({
      error,
      startedAt,
      totalCalls: calls.length,
    });
    throw new HandledCliError();
  }
  for (const [index, call] of calls.entries()) {
    const callNumber = index + 1;
    stderr.write(
      `${formatMcpStatusLine(
        `run ${callNumber}/${calls.length} ${call.tool} started${call.dryRun ? " (dry run)" : ""}`
      )}\n`
    );
    try {
      const result = await core.callTool({
        name: call.tool,
        input: call.input,
        dryRun: call.dryRun,
      });
      const toolError = getMcpToolCallError(result);
      if (toolError !== undefined) {
        throw toolError;
      }
      const checkpoint = getResultCheckpoint(
        call.tool,
        result.structuredContent
      );
      await updatePersistedMcpCheckpoint({
        tool: call.tool,
        structuredContent: result.structuredContent,
      });
      const session = result.structuredContent.meta.session;
      const committed =
        session === undefined ? "" : `; committed=${session.committed}`;
      stderr.write(
        `${formatMcpStatusLine(
          `run ${callNumber}/${calls.length} ${call.tool} succeeded${committed}`
        )}\n`
      );
      results.push({
        tool: call.tool,
        ok: true,
        structuredContent: result.structuredContent,
      });
      if (checkpoint !== undefined && callNumber < calls.length) {
        const checkpointStopPayload = createMcpRunCheckpointStopPayload({
          checkpoint,
          completedCalls: callNumber,
          totalCalls: calls.length,
          results,
          elapsedMs: Date.now() - startedAt,
        });
        stderr.write(
          `${formatMcpStatusLine(
            `run stopped after ${callNumber}/${calls.length} ${call.tool}: ${checkpointStopPayload.error.message}`
          )}\n`
        );
        printJson(checkpointStopPayload);
        throw new McpRunCheckpointStop();
      }
    } catch (error) {
      if (error instanceof McpRunCheckpointStop) {
        throw new HandledCliError();
      }
      const structuredError = getMcpRunError(error);
      results.push({
        tool: call.tool,
        ok: false,
        error: structuredError,
      });
      const payload = createMcpRunErrorPayload({
        error: structuredError,
        completedCalls: index,
        failedCall: callNumber,
        totalCalls: calls.length,
        results,
        elapsedMs: Date.now() - startedAt,
      });
      stderr.write(
        `${formatMcpStatusLine(
          `run ${callNumber}/${calls.length} ${call.tool} failed: ${payload.error.message}`
        )}\n`
      );
      printJson(payload);
      throw new HandledCliError();
    }
  }
  stderr.write(
    `${formatMcpStatusLine(
      `run succeeded in ${Date.now() - startedAt}ms with ${calls.length} calls`
    )}\n`
  );
  printJson({
    ok: true,
    data: {
      totalCalls: calls.length,
      results,
    },
    meta: {
      elapsedMs: Date.now() - startedAt,
    },
  });
};

export const mcpListTools = async (_options: McpListToolsOptions) => {
  const startedAt = Date.now();
  stderr.write(`${formatMcpStatusLine("list-tools started")}\n`);
  const { host } = await createCliMcpHost();
  const core = createProjectSessionMcpCore(host);
  const result = await core.callTool({
    name: "meta.index",
    input: {},
    dryRun: false,
  });
  stderr.write(
    `${formatMcpStatusLine(
      `list-tools succeeded in ${Date.now() - startedAt}ms`
    )}\n`
  );
  printJson(result.structuredContent);
};

export const mcpListResources = async (_options: McpListResourcesOptions) => {
  const startedAt = Date.now();
  const { host } = await createCliMcpHost();
  const core = createProjectSessionMcpCore(host);
  printJson({
    ok: true,
    data: { resources: core.listResources() },
    meta: { elapsedMs: Date.now() - startedAt },
  });
};

export const mcpReadResource = async (options: McpReadResourceOptions) => {
  if (options.uri === undefined || options.uri.trim() === "") {
    throw new Error("mcp read-resource requires a resource URI.");
  }
  const startedAt = Date.now();
  try {
    const { host } = await createCliMcpHost();
    const core = createProjectSessionMcpCore(host);
    printJson({
      ok: true,
      data: await core.readResource({ uri: options.uri }),
      meta: { elapsedMs: Date.now() - startedAt },
    });
  } catch (error) {
    printJson(
      __testing__.createMcpResourceErrorPayload(error, Date.now() - startedAt)
    );
    throw new HandledCliError();
  }
};

export const mcp = async () => {
  const status = createMcpStatusReporter();
  let didReportClose = false;
  const reportClose = () => {
    if (didReportClose) {
      return;
    }
    didReportClose = true;
    status.connectionClosed();
  };
  stdin.once("end", reportClose);
  stdin.once("close", reportClose);
  status.starting();
  const { host, toolCount, reportLog, apiContract } = await createCliMcpHost();
  status.sessionReady();
  status.apiContract(apiContract);
  status.ready(toolCount);
  const server = await connectProjectSessionMcpServer({
    ...host,
    getErrorCode: getStableErrorCode,
    reportLog: (_level, message) => {
      reportLog(message);
    },
    transport: await createMcpStdioTransport({ stdin, stdout }),
  });
  server.onclose = reportClose;
  server.onerror = (error) => {
    status.connectionError(error);
  };
};
