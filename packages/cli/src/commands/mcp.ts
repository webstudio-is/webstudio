import { cwd, stdin, stdout, stderr } from "node:process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  connectProjectSessionMcpServer,
  createProjectSessionMcpCore,
  createMcpStdioTransport,
  isReadOnlyProjectSessionMcpToolCall,
} from "@webstudio-is/project-build/mcp";
import {
  getProjectBasicAuthCredentials,
  type BuilderNamespace,
} from "@webstudio-is/project-build/contracts";
import { diffPngFiles } from "@webstudio-is/vision/diff";
import {
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
  type IssueReportRecentFailure,
} from "@webstudio-is/protocol";
import * as httpClient from "@webstudio-is/http-client";
import packageJson from "../../package.json" with { type: "json" };
import type { ProjectSessionSnapshot } from "@webstudio-is/project-build/project-session";
import {
  formatValidationErrorMessage,
  type SemanticValidationIssue,
} from "@webstudio-is/project-build/runtime";
import {
  inspectMdxAssetSource,
  mdxAssetInspectionNamespaces,
} from "@webstudio-is/project-build/runtime";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  validateTextAssetSourceBytes,
  type TextAssetSourceDiagnostic,
} from "@webstudio-is/content-engine/mdx";
import { contentEngineLimits } from "@webstudio-is/content-engine/limits";
import { assetQueryRequest } from "@webstudio-is/content-engine";
import { assetType, getFileExtension } from "@webstudio-is/sdk";
import { resolveApiConnection } from "../api-connection";
import {
  getCliErrorIssues,
  getCliErrorMessage,
  getStableErrorCode,
  isMissingApiAccessError,
} from "../error-codes";
import { HandledCliError, isHandledCliError } from "../errors";
import { loadJSONFile } from "../fs-utils";
import {
  assertCliServerOperationSupported,
  createCliProjectRestorePointStorage,
  createCliProjectSession,
  createIssueReportFailure,
  createIssueReportRuntime,
  getCliProjectRestorePointsFile,
  getCliServerApiContract,
  getSupportedPublicApiOperations,
  type CliServerApiContract,
  writeCliProjectSessionPreviewDataFile,
  type CliProjectSession,
} from "../project-session";
import { executeProjectSessionApiOperation } from "../project-session-api";
import { createPreviewController } from "../preview-server";
import {
  createScreenshotCaptureSession,
  installTesseractForOcr,
} from "../screenshot";
import {
  createLocalUploadAssetInput,
  createLocalUploadAssetsInput,
  createLocalUpdateAssetContentInput,
  downloadAssetFile,
  getLocalAssetPath,
  LOCAL_ASSETS_DIR,
} from "../asset-files";
import {
  getVisionVerificationLoop,
  getVisionWorkflowSummary,
  visualVerificationRule,
} from "../mcp-guidance";
import { readCliDoc } from "../docs";
import { printJson } from "../json-output";
import { isPlainRecord } from "../type-utils";
import { withTimeout } from "../async-utils";
import { LOCAL_DATA_FILE } from "../config";
import {
  assertMcpBatchMutationApproved,
  isMcpProjectsManifest,
  parseMcpProjectsManifest,
  runMcpProjectBatch,
  type McpBatchCall,
} from "./mcp-batch";
import { apiCompatibilityHeaders } from "./api";
import { importProject as importProjectCommand } from "./import";
import {
  assertPersistedMcpCheckpointAcknowledged,
  getResultCheckpoint,
  readPersistedMcpCheckpoint,
  updatePersistedMcpCheckpoint,
  type McpProjectScope,
  type PersistedMcpCheckpoint,
} from "./mcp-checkpoint";
import {
  createMcpPreviewHandlers,
  createPreviewFreshness,
  resolveMcpScreenshotInput,
  startMcpPreview,
} from "./mcp-preview";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

type StartableProjectSession = {
  snapshot: ProjectSessionSnapshot | undefined;
  initialize: () => Promise<unknown>;
  markStale: (namespaces: readonly BuilderNamespace[]) => Promise<unknown>;
};

type PublicApiCommand = (typeof publicApiOperations)[number]["command"];
type CliMcpHost = Parameters<
  typeof createProjectSessionMcpCore<PublicApiCommand>
>[0];

type McpRunCall = McpBatchCall;

export const prepareMcpProjectSession = async (
  session: StartableProjectSession
) => {
  await session.initialize();
};

const mcpStatusPrefix = "[webstudio mcp]";
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

const createMcpInputError = (message: string, code: string) =>
  Object.assign(new Error(message), { code });

const hasAssetName = (value: unknown): value is { name: string } =>
  isPlainRecord(value) && typeof value.name === "string";

const createAssetInputIssue = ({
  path,
  message,
  code,
}: {
  path: string[];
  message: string;
  code: string;
}) => ({
  path,
  code,
  message,
  constraint: code,
});

const getTextAssetFormat = (value: string): "md" | "mdx" | undefined => {
  const extension = (getFileExtension(value) ?? value).toLowerCase();
  return extension === "md" || extension === "mdx" ? extension : undefined;
};

const getTextAssetDescriptorIssues = ({
  assets,
  pathPrefix,
}: {
  assets: unknown[];
  pathPrefix: string[];
}) => {
  const issues: SemanticValidationIssue[] = [];
  for (const [index, value] of assets.entries()) {
    const assetPath =
      pathPrefix[0] === "asset" ? pathPrefix : [...pathPrefix, String(index)];
    if (isPlainRecord(value) === false) {
      issues.push(
        createAssetInputIssue({
          path: assetPath,
          code: "invalid_type",
          message: "Asset descriptor must be an object.",
        })
      );
      continue;
    }
    const asset = value;
    const allowedFields = new Set([
      "name",
      "type",
      "format",
      "description",
      "folderId",
      "force",
      "meta",
    ]);
    for (const field of Object.keys(asset)) {
      if (allowedFields.has(field) === false) {
        issues.push(
          createAssetInputIssue({
            path: [...assetPath, field],
            code: "unknown_field",
            message: `Asset descriptor field ${JSON.stringify(field)} is not supported.`,
          })
        );
      }
    }
    if (typeof asset.name !== "string") {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "name"],
          code: "invalid_type",
          message: "Asset name must be a string.",
        })
      );
    }
    if (
      typeof asset.type !== "string" ||
      assetType.options.includes(
        asset.type as (typeof assetType.options)[number]
      ) === false
    ) {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "type"],
          code: "invalid_value",
          message: `Asset type must be one of ${assetType.options.join(", ")}.`,
        })
      );
    }
    for (const field of ["format", "description", "folderId"] as const) {
      if (asset[field] !== undefined && typeof asset[field] !== "string") {
        issues.push(
          createAssetInputIssue({
            path: [...assetPath, field],
            code: "invalid_type",
            message: `Asset ${field} must be a string.`,
          })
        );
      }
    }
    if (asset.folderId === "") {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "folderId"],
          code: "too_small",
          message: "Asset folderId must not be empty.",
        })
      );
    }
    if (asset.force !== undefined && typeof asset.force !== "boolean") {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "force"],
          code: "invalid_type",
          message: "Asset force must be a boolean.",
        })
      );
    }
    if (asset.meta !== undefined && isPlainRecord(asset.meta) === false) {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "meta"],
          code: "invalid_type",
          message: "Asset meta must be an object.",
        })
      );
    }
    const name = typeof asset.name === "string" ? asset.name : "";
    const filenameFormat = getFileExtension(name)?.toLowerCase();
    const declaredFormat =
      typeof asset.format === "string" ? asset.format.toLowerCase() : undefined;
    const mentionsTextFormat =
      filenameFormat === "md" ||
      filenameFormat === "mdx" ||
      declaredFormat === "md" ||
      declaredFormat === "mdx";
    if (
      mentionsTextFormat &&
      declaredFormat !== undefined &&
      declaredFormat !== filenameFormat
    ) {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "format"],
          code: "asset_filename_format_mismatch",
          message: `Asset filename and format must match. ${JSON.stringify(name)} has extension ${JSON.stringify(filenameFormat ?? "(none)")} but format is ${JSON.stringify(declaredFormat ?? "(missing)")}.`,
        })
      );
    }
    if (
      mentionsTextFormat &&
      typeof asset.type === "string" &&
      asset.type !== "file"
    ) {
      issues.push(
        createAssetInputIssue({
          path: [...assetPath, "type"],
          code: "markdown_asset_type_mismatch",
          message: `Markdown and MDX Assets must use type "file", not ${JSON.stringify(asset.type)}.`,
        })
      );
    }
  }
  return issues;
};

const assertTextAssetDescriptorFormats = ({
  assets,
  pathPrefix,
}: {
  assets: unknown[];
  pathPrefix: string[];
}) => {
  const issues = getTextAssetDescriptorIssues({ assets, pathPrefix });
  if (issues.length > 0) {
    throw Object.assign(
      new Error("Markdown and MDX Asset descriptors are invalid."),
      { code: "INVALID_INPUT", issues }
    );
  }
};

const throwAssetInputIssues = (issues: readonly SemanticValidationIssue[]) => {
  if (issues.length > 0) {
    throw Object.assign(new Error("Asset operation input is invalid."), {
      code: "INVALID_INPUT",
      issues,
    });
  }
};

const getRootAssetInputIssues = ({
  input,
  allowedFields,
}: {
  input: Record<string, unknown>;
  allowedFields: readonly string[];
}) =>
  Object.keys(input).flatMap((field) =>
    allowedFields.includes(field)
      ? []
      : [
          createAssetInputIssue({
            path: [field],
            code: "unknown_field",
            message: `Asset operation field ${JSON.stringify(field)} is not supported.`,
          }),
        ]
  );

const getMcpUploadAssetInput = (input: unknown) => {
  if (isPlainRecord(input) === false) {
    throwAssetInputIssues([
      createAssetInputIssue({
        path: [],
        code: "invalid_type",
        message: "upload-asset input must be an object.",
      }),
    ]);
    throw new Error("Unreachable invalid upload input");
  }
  throwAssetInputIssues([
    ...getRootAssetInputIssues({
      input,
      allowedFields: ["asset", "assetsDir"],
    }),
    ...(input.assetsDir === undefined || typeof input.assetsDir === "string"
      ? []
      : [
          createAssetInputIssue({
            path: ["assetsDir"],
            code: "invalid_type",
            message: "assetsDir must be a string.",
          }),
        ]),
    ...getTextAssetDescriptorIssues({
      assets: [input.asset],
      pathPrefix: ["asset"],
    }),
  ]);
  const asset = input.asset;
  if (hasAssetName(asset) === false) {
    throw new Error("Unreachable invalid Asset descriptor");
  }
  const prepared = createLocalUploadAssetInput({
    asset,
    assetsDir:
      typeof input.assetsDir === "string" ? input.assetsDir : undefined,
    readFile,
  });
  let content: Promise<unknown> | undefined;
  return {
    ...prepared,
    readAssetData: () => (content ??= prepared.readAssetData(asset)),
  };
};

const getMcpUploadAssetsInput = (input: unknown) => {
  if (isPlainRecord(input) === false) {
    throwAssetInputIssues([
      createAssetInputIssue({
        path: [],
        code: "invalid_type",
        message: "upload-assets input must be an object.",
      }),
    ]);
    throw new Error("Unreachable invalid upload input");
  }
  const assets = Array.isArray(input.assets) ? input.assets : [];
  throwAssetInputIssues([
    ...getRootAssetInputIssues({
      input,
      allowedFields: ["assets", "assetsDir"],
    }),
    ...(Array.isArray(input.assets)
      ? []
      : [
          createAssetInputIssue({
            path: ["assets"],
            code: "invalid_type",
            message: "upload-assets requires an assets array.",
          }),
        ]),
    ...(input.assetsDir === undefined || typeof input.assetsDir === "string"
      ? []
      : [
          createAssetInputIssue({
            path: ["assetsDir"],
            code: "invalid_type",
            message: "assetsDir must be a string.",
          }),
        ]),
    ...getTextAssetDescriptorIssues({ assets, pathPrefix: ["assets"] }),
  ]);
  if (assets.every(hasAssetName) === false) {
    throw new Error("Unreachable invalid Asset descriptors");
  }
  const prepared = createLocalUploadAssetsInput({
    assets,
    assetsDir:
      typeof input.assetsDir === "string" ? input.assetsDir : undefined,
    readFile,
  });
  const contentByAsset = new Map<object, Promise<unknown>>();
  return {
    ...prepared,
    readAssetData: (asset: { name: string }) => {
      let content = contentByAsset.get(asset);
      if (content === undefined) {
        content = prepared.readAssetData(asset);
        contentByAsset.set(asset, content);
      }
      return content;
    },
  };
};

const getMcpUpdateAssetContentInput = (input: unknown) => {
  if (isPlainRecord(input) === false) {
    throwAssetInputIssues([
      createAssetInputIssue({
        path: [],
        code: "invalid_type",
        message: "update-asset-content input must be an object.",
      }),
    ]);
    throw new Error("Unreachable invalid update input");
  }
  const issues = getRootAssetInputIssues({
    input,
    allowedFields: ["assetId", "expectedName", "extension", "path", "content"],
  });
  for (const field of ["assetId", "expectedName"] as const) {
    if (typeof input[field] !== "string" || input[field].length === 0) {
      issues.push(
        createAssetInputIssue({
          path: [field],
          code: typeof input[field] === "string" ? "too_small" : "invalid_type",
          message: `${field} must be a non-empty string.`,
        })
      );
    }
  }
  for (const field of ["extension", "path"] as const) {
    if (
      input[field] !== undefined &&
      (typeof input[field] !== "string" || input[field].length === 0)
    ) {
      issues.push(
        createAssetInputIssue({
          path: [field],
          code: typeof input[field] === "string" ? "too_small" : "invalid_type",
          message: `${field} must be a non-empty string.`,
        })
      );
    }
  }
  if (input.content !== undefined && typeof input.content !== "string") {
    issues.push(
      createAssetInputIssue({
        path: ["content"],
        code: "invalid_type",
        message: "content must be a string.",
      })
    );
  }
  const hasPath = typeof input.path === "string" && input.path.length > 0;
  const hasContent = typeof input.content === "string";
  if (hasPath === hasContent) {
    issues.push(
      createAssetInputIssue({
        path: [],
        code: "invalid_source_selection",
        message: "Provide exactly one of path or content.",
      })
    );
  }
  throwAssetInputIssues(issues);
  if (
    typeof input.assetId !== "string" ||
    typeof input.expectedName !== "string"
  ) {
    throw new Error("Unreachable invalid update input");
  }
  const prepared = createLocalUpdateAssetContentInput({
    assetId: input.assetId,
    expectedName: input.expectedName,
    extension:
      typeof input.extension === "string" ? input.extension : undefined,
    path: typeof input.path === "string" ? input.path : undefined,
    content: typeof input.content === "string" ? input.content : undefined,
    readFile,
  });
  let content: Promise<unknown> | undefined;
  return {
    ...prepared,
    readAssetData: () => (content ??= prepared.readAssetData()),
  };
};

type TextAssetDiagnostic =
  | TextAssetSourceDiagnostic
  | Awaited<ReturnType<typeof inspectMdxAssetSource>>[number];

type TextAssetWriteFeedback =
  | Readonly<{
      type: "uploads";
      sourceDiagnostics: readonly Readonly<{
        index: number;
        name: string;
        source: string;
        format: "md" | "mdx";
        issuePath: string[];
        diagnostics: readonly TextAssetDiagnostic[];
      }>[];
    }>
  | Readonly<{
      type: "update";
      source: string;
      diagnostics: readonly TextAssetDiagnostic[];
    }>;

const createTextAssetContentError = ({
  assetId,
  name,
  path: filePath,
  issuePath,
  diagnostic,
  code,
}: {
  assetId?: string;
  name?: string;
  path?: string;
  issuePath: string[];
  diagnostic: TextAssetSourceDiagnostic;
  code: "CONTENT_DECODING_FAILED" | "CONTENT_LIMIT_EXCEEDED";
}) => {
  const location = name ?? filePath ?? assetId ?? "Markdown or MDX Asset";
  const issue = {
    ...diagnostic,
    path: issuePath,
    constraint: diagnostic.code,
    ...(assetId === undefined ? {} : { assetId }),
    ...(name === undefined ? {} : { name }),
    ...(filePath === undefined ? {} : { file: filePath }),
  };
  return Object.assign(new Error(`${location}: ${diagnostic.message}`), {
    code,
    issues: [issue],
    ...(assetId === undefined ? {} : { assetId }),
    ...(name === undefined ? {} : { name }),
    ...(filePath === undefined ? {} : { path: filePath }),
  });
};

const validateTextAssetContent = async ({
  content,
  format,
  assetId,
  name,
  path: filePath,
  issuePath,
  session,
}: {
  content: unknown;
  format: "md" | "mdx";
  assetId?: string;
  name?: string;
  path?: string;
  issuePath: string[];
  session?: Pick<CliProjectSession, "ensureNamespaces">;
}): Promise<{
  source: string;
  diagnostics: readonly TextAssetDiagnostic[];
}> => {
  const bytes =
    typeof content === "string"
      ? new TextEncoder().encode(content)
      : content instanceof Uint8Array
        ? content
        : undefined;
  const validation =
    bytes === undefined
      ? undefined
      : await validateTextAssetSourceBytes({ source: bytes, format });
  if (bytes === undefined || validation === undefined) {
    throw createTextAssetContentError({
      assetId,
      name,
      path: filePath,
      issuePath,
      code: "CONTENT_DECODING_FAILED",
      diagnostic: {
        code: format === "md" ? "MARKDOWN_BODY_DECODING_FAILED" : "invalid-mdx",
        severity: "error",
        message: `${format === "md" ? "Markdown" : "MDX"} content must be UTF-8 text`,
      },
    });
  }
  const source = validation.source;
  if (source === undefined) {
    const diagnostic = validation.diagnostics[0];
    if (diagnostic === undefined) {
      throw new Error("Text Asset validation did not return decoded source.");
    }
    throw createTextAssetContentError({
      assetId,
      name,
      path: filePath,
      issuePath,
      diagnostic,
      code:
        bytes.byteLength > contentEngineLimits.hydratedFileBytes
          ? "CONTENT_LIMIT_EXCEEDED"
          : "CONTENT_DECODING_FAILED",
    });
  }
  if (format !== "mdx" || assetId === undefined || session === undefined) {
    return { source, diagnostics: validation.diagnostics };
  }
  const snapshot = await session.ensureNamespaces(mdxAssetInspectionNamespaces);
  return {
    source,
    diagnostics: await inspectMdxAssetSource({
      source,
      assetId,
      state: snapshot.state,
      metas: componentMetas,
      projectId: snapshot.projectId,
    }),
  };
};

const prepareTextAssetWriteFeedback = async ({
  command,
  input,
  operationInput,
  session,
}: {
  command: string;
  input: unknown;
  operationInput: unknown;
  session?: Pick<CliProjectSession, "ensureNamespaces">;
}): Promise<TextAssetWriteFeedback | undefined> => {
  if (
    (command === "upload-asset" || command === "upload-assets") &&
    isPlainRecord(input) &&
    isPlainRecord(operationInput) &&
    typeof operationInput.readAssetData === "function"
  ) {
    const assets =
      command === "upload-asset"
        ? isPlainRecord(input.asset)
          ? [input.asset]
          : []
        : Array.isArray(input.assets)
          ? input.assets.filter(isPlainRecord)
          : [];
    const sourceDiagnostics = [];
    const validationIssues: Array<{
      index: number;
      issues: NonNullable<ReturnType<typeof getCliErrorIssues>>;
    }> = [];
    const fatalErrors: unknown[] = [];
    for (const [index, asset] of assets.entries()) {
      if (typeof asset.name !== "string") {
        continue;
      }
      const assetName = asset.name;
      const format = getTextAssetFormat(
        typeof asset.format === "string" ? asset.format : assetName
      );
      if (format === undefined) {
        continue;
      }
      const issuePath =
        command === "upload-asset"
          ? ["asset", "name"]
          : ["assets", String(index), "name"];
      try {
        const { source, diagnostics } = await validateTextAssetContent({
          content: await operationInput.readAssetData(asset),
          format,
          name: assetName,
          issuePath,
        });
        sourceDiagnostics.push({
          index,
          name: assetName,
          source,
          format,
          issuePath,
          diagnostics,
        });
        validationIssues.push({
          index,
          issues: diagnostics.map((diagnostic) => ({
            ...diagnostic,
            path: issuePath,
            constraint: diagnostic.code,
            message:
              "message" in diagnostic && typeof diagnostic.message === "string"
                ? diagnostic.message
                : "reason" in diagnostic &&
                    typeof diagnostic.reason === "string"
                  ? diagnostic.reason
                  : diagnostic.code,
            name: assetName,
          })),
        });
      } catch (error) {
        const issues = getCliErrorIssues(error);
        const code = getStableErrorCode(error);
        if (
          issues === undefined ||
          (code !== "CONTENT_DECODING_FAILED" &&
            code !== "CONTENT_LIMIT_EXCEEDED")
        ) {
          throw error;
        }
        validationIssues.push({ index, issues });
        fatalErrors.push(error);
      }
    }
    if (fatalErrors.length > 0) {
      const code = fatalErrors.some(
        (error) => getStableErrorCode(error) === "CONTENT_DECODING_FAILED"
      )
        ? "CONTENT_DECODING_FAILED"
        : "CONTENT_LIMIT_EXCEEDED";
      throw Object.assign(
        new Error(
          `${fatalErrors.length} Markdown or MDX Asset${fatalErrors.length === 1 ? "" : "s"} could not be read before upload.`
        ),
        {
          code,
          issues: validationIssues
            .sort((left, right) => left.index - right.index)
            .flatMap(({ issues }) => issues),
        }
      );
    }
    return sourceDiagnostics.length === 0
      ? undefined
      : { type: "uploads", sourceDiagnostics };
  }
  if (
    command !== "update-asset-content" ||
    isPlainRecord(input) === false ||
    isPlainRecord(operationInput) === false ||
    typeof operationInput.readAssetData !== "function"
  ) {
    return;
  }
  const format = getTextAssetFormat(
    typeof input.extension === "string"
      ? input.extension
      : typeof input.expectedName === "string"
        ? input.expectedName
        : ""
  );
  if (format === undefined) {
    return;
  }
  const assetId = typeof input.assetId === "string" ? input.assetId : undefined;
  const { source, diagnostics } = await validateTextAssetContent({
    content: await operationInput.readAssetData(),
    format,
    assetId,
    name:
      typeof input.expectedName === "string" ? input.expectedName : undefined,
    issuePath: ["content"],
    session,
  });
  return { type: "update", source, diagnostics };
};

const validateDownloadedTextAsset = async ({
  assetId,
  path: filePath,
  format,
  content,
  session,
}: {
  assetId: string;
  path: string;
  format: "md" | "mdx";
  content: Uint8Array;
  session?: Pick<CliProjectSession, "ensureNamespaces">;
}) =>
  validateTextAssetContent({
    content,
    format,
    assetId,
    path: filePath,
    issuePath: [filePath],
    session,
  });

const materializeValidatedDownloadedAsset = async ({
  assetId,
  remotePath,
  localPath,
  diagnostics,
}: {
  assetId: string;
  remotePath: string;
  localPath: string;
  diagnostics: readonly TextAssetDiagnostic[];
}) => {
  const remote = await readFile(remotePath);
  let local: Uint8Array | undefined;
  try {
    local = await readFile(localPath);
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
  if (local !== undefined && Buffer.from(local).equals(remote) === false) {
    const issues = [
      ...diagnostics.map((diagnostic) => ({
        ...diagnostic,
        path: [localPath],
        constraint: diagnostic.code,
        assetId,
        file: localPath,
        message:
          "message" in diagnostic && typeof diagnostic.message === "string"
            ? diagnostic.message
            : "reason" in diagnostic && typeof diagnostic.reason === "string"
              ? diagnostic.reason
              : diagnostic.code,
      })),
      {
        code: "local_asset_conflict",
        severity: "error" as const,
        path: [localPath],
        constraint: "remote_content_matches_local_file",
        assetId,
        file: localPath,
        message:
          "The existing local file differs from the current project Asset. Move or remove it, then download again.",
      },
    ];
    throw Object.assign(
      new Error(
        `The existing local file differs from the current project Asset: ${localPath}`
      ),
      { code: "CONFLICT", assetId, path: localPath, issues }
    );
  }
  if (local === undefined) {
    await mkdir(path.dirname(localPath), { recursive: true });
    await copyFile(remotePath, localPath);
  }
  return remote;
};

const withTextAssetWriteFeedback = async <
  Envelope extends { result: unknown },
>({
  command,
  input,
  operationInput,
  result,
  session,
  feedback,
}: {
  command: string;
  input: unknown;
  operationInput: unknown;
  result: Envelope;
  session?: Pick<CliProjectSession, "ensureNamespaces">;
  feedback?: TextAssetWriteFeedback;
}): Promise<Envelope> => {
  const prepared =
    feedback ??
    (await prepareTextAssetWriteFeedback({
      command,
      input,
      operationInput,
      session,
    }));
  if (prepared?.type === "uploads") {
    const uploaded =
      isPlainRecord(result.result) && Array.isArray(result.result.uploaded)
        ? result.result.uploaded
        : [];
    const uploadedByName = new Map<string, Array<Record<string, unknown>>>();
    for (const asset of uploaded) {
      if (isPlainRecord(asset) === false || typeof asset.name !== "string") {
        continue;
      }
      const matches = uploadedByName.get(asset.name) ?? [];
      matches.push(asset);
      uploadedByName.set(asset.name, matches);
    }
    const sourceDiagnostics = await Promise.all(
      prepared.sourceDiagnostics.map(async (entry) => {
        let diagnostics = entry.diagnostics;
        if (entry.format === "mdx" && session !== undefined) {
          const uploadedAsset = uploadedByName.get(entry.name)?.shift();
          if (typeof uploadedAsset?.id === "string") {
            ({ diagnostics } = await validateTextAssetContent({
              content: entry.source,
              format: entry.format,
              assetId: uploadedAsset.id,
              name: entry.name,
              issuePath: entry.issuePath,
              session,
            }));
          }
        }
        return {
          index: entry.index,
          name: entry.name,
          diagnostics,
        };
      })
    );
    return {
      ...result,
      result: {
        ...(isPlainRecord(result.result)
          ? result.result
          : { result: result.result }),
        sourceDiagnostics,
      },
    };
  }
  if (prepared?.type !== "update") {
    return result;
  }
  return {
    ...result,
    result: {
      ...(isPlainRecord(result.result)
        ? result.result
        : { result: result.result }),
      source: prepared.source,
      diagnostics: prepared.diagnostics,
    },
  };
};

const getMcpOperationInput = (command: string, input: unknown) => {
  if (command === "upload-asset") {
    return getMcpUploadAssetInput(input);
  }
  if (command === "upload-assets") {
    return getMcpUploadAssetsInput(input);
  }
  if (command === "update-asset-content") {
    return getMcpUpdateAssetContentInput(input);
  }
  if (command === "validate-asset-query") {
    return assetQueryRequest.pick({ query: true }).parse(input);
  }
  if (command === "preview-asset-query") {
    return assetQueryRequest.parse(input);
  }
  return input;
};

const publicApiOperationByCommand = new Map<
  string,
  (typeof publicApiOperations)[number]
>(publicApiOperations.map((operation) => [operation.command, operation]));

const shouldInvalidatePreview = (command: string) =>
  publicApiOperationByCommand.get(command)?.method === "mutation";

const getLoadedProjectSessionSnapshot = (session: StartableProjectSession) => {
  const snapshot = session.snapshot;
  if (snapshot === undefined) {
    throw new Error(
      "Project session snapshot is not loaded. Run a project-session command such as status or refresh before previewing from session."
    );
  }
  return snapshot;
};

export const mcpOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("project", {
      type: "string",
      describe:
        "Saved project id to use without changing this directory's linked project",
    })
    .option("tool-name-format", {
      type: "string",
      choices: ["canonical", "underscores"] as const,
      default: "canonical" as const,
      describe:
        "Format exposed MCP tool names for clients with stricter naming rules",
    })
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
      "Run an MCP workflow manifest for one or more linked projects",
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
      "$0 mcp run .temp/projects.json --dry-run --concurrency 2",
      "Run one resumable workflow across independently linked projects"
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
> & { project?: string };

const mcpListResourcesOptions = (yargs: CommonYargsArgv) =>
  yargs.option("json", {
    type: "boolean",
    describe: "Accepted for compatibility. MCP resource output is always JSON",
    default: false,
  });

type McpListResourcesOptions = StrictYargsOptionsToInterface<
  typeof mcpListResourcesOptions
> & { project?: string };

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
> & { uri?: string; project?: string };

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
  project?: string;
};

const mcpRunOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("input", {
      type: "string",
      describe:
        'Inline JSON or path to a JSON workflow with "calls" and optional "projects"',
      demandOption: true,
    })
    .option("dry-run", {
      type: "boolean",
      describe: "Run local-capable mutation tools without committing",
      default: false,
    })
    .option("approve-mutations", {
      type: "boolean",
      describe: "Explicitly approve committed mutations in a projects batch",
      default: false,
    })
    .option("concurrency", {
      type: "number",
      describe: "Maximum projects to run concurrently (projects batches only)",
    })
    .option("resume", {
      type: "boolean",
      describe: "Resume a projects batch and skip successful calls",
      default: true,
    })
    .option("json", {
      type: "boolean",
      describe: "Accepted for compatibility. MCP run output is always JSON",
      default: false,
    });

type McpRunOptions = StrictYargsOptionsToInterface<typeof mcpRunOptions> & {
  input?: string;
  project?: string;
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
    : isPlainRecord(value) && Array.isArray(value.calls)
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
    if (isPlainRecord(call) === false) {
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

const readMcpRunInput = async (input: string | undefined) => {
  if (input === undefined || input.length === 0) {
    throw new Error("mcp run requires inline JSON or an input file.");
  }
  const trimmedInput = input.trim();
  if (trimmedInput.startsWith("{") || trimmedInput.startsWith("[")) {
    try {
      return {
        value: JSON.parse(trimmedInput) as unknown,
        baseDirectory: cwd(),
      };
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
    return {
      value: JSON.parse(await readFile(inputPath, "utf8")) as unknown,
      baseDirectory: path.dirname(inputPath),
    };
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

const parseMcpRunInput = async (input: string | undefined) =>
  parseMcpRunCalls((await readMcpRunInput(input)).value);

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
  const isValidationError =
    error instanceof Error && error.name === "ZodError" && issues !== undefined;
  if (isValidationError) {
    return {
      code: "INVALID_INPUT",
      message: formatValidationErrorMessage("Tool input is invalid.", issues),
      issues,
    };
  }
  if (
    isPlainRecord(error) &&
    typeof error.message === "string" &&
    (error.code === undefined || typeof error.code === "string")
  ) {
    return {
      code: isMissingApiAccessError(error)
        ? "UNAUTHORIZED"
        : (getStableErrorCode(error) ?? "MCP_TOOL_FAILED"),
      message: getCliErrorMessage(error),
      ...(issues === undefined ? {} : { issues }),
    };
  }
  const code = isMissingApiAccessError(error)
    ? "UNAUTHORIZED"
    : (getStableErrorCode(error) ?? "MCP_TOOL_FAILED");
  const message = getCliErrorMessage(error);
  return { code, message, ...(issues === undefined ? {} : { issues }) };
};

const validateSingleOpCallInput = (tool: string, input: unknown) => {
  if (tool !== "audit" || isPlainRecord(input) === false) {
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

type ActiveMcpRunCall = {
  number: number;
  tool: string;
};

type McpRunTermination =
  | { type: "beforeExit"; exitCode: number }
  | { type: "signal"; signal: NodeJS.Signals };

const reportMcpSingleOpCallTermination = ({
  termination,
  tool,
  elapsedMs,
  writeStatus = (message) => stderr.write(`${message}\n`),
  writeResult = printJson,
  setExitCode = (code) => {
    process.exitCode = code;
  },
}: {
  termination: McpRunTermination;
  tool: string;
  elapsedMs: number;
  writeStatus?: (message: string) => void;
  writeResult?: (result: unknown) => void;
  setExitCode?: (code: number) => void;
}) => {
  const error = {
    code: "MCP_CALL_TERMINATED",
    message: `MCP single-op-call ${tool} terminated before returning a result.`,
  };
  const payload = createMcpSingleOpCallErrorPayload({ error, elapsedMs });
  writeStatus(
    formatMcpStatusLine(`single-op-call ${tool} terminated: ${error.message}`)
  );
  writeResult({
    ...payload,
    meta: {
      ...payload.meta,
      termination,
    },
  });
  if (termination.type === "beforeExit") {
    setExitCode(1);
  }
};

const mcpRunTerminationCleanupTimeout = 5000;

const reportMcpRunTermination = ({
  termination,
  activeCall,
  totalCalls,
  results,
  elapsedMs,
  writeStatus = (message) => stderr.write(`${message}\n`),
  writeResult = printJson,
  setExitCode = (code) => {
    process.exitCode = code;
  },
}: {
  termination: McpRunTermination;
  activeCall: ActiveMcpRunCall;
  totalCalls: number;
  results: unknown[];
  elapsedMs: number;
  writeStatus?: (message: string) => void;
  writeResult?: (result: unknown) => void;
  setExitCode?: (code: number) => void;
}) => {
  const error = {
    code: "MCP_RUN_TERMINATED",
    message: `MCP run terminated before call ${activeCall.number}/${totalCalls} ${activeCall.tool} returned a result.`,
  };
  const payload = createMcpRunErrorPayload({
    error,
    completedCalls: results.length,
    totalCalls,
    results,
    elapsedMs,
  });
  writeStatus(
    formatMcpStatusLine(
      `run ${activeCall.number}/${totalCalls} ${activeCall.tool} terminated: ${error.message}`
    )
  );
  writeResult({
    ...payload,
    data: { ...payload.data, unfinishedCall: activeCall },
    meta: {
      ...payload.meta,
      termination,
    },
  });
  if (termination.type === "beforeExit") {
    setExitCode(1);
  }
};

const createMcpRunTerminationController = ({
  getActiveCall,
  totalCalls,
  results,
  startedAt,
  disposeHost,
  reportTermination = reportMcpRunTermination,
  cleanupTimeout = mcpRunTerminationCleanupTimeout,
  exitWithSignal = (signal) => {
    process.kill(process.pid, signal);
  },
}: {
  getActiveCall: () => ActiveMcpRunCall | undefined;
  totalCalls: number;
  results: unknown[];
  startedAt: number;
  disposeHost: () => Promise<void>;
  reportTermination?: typeof reportMcpRunTermination;
  cleanupTimeout?: number;
  exitWithSignal?: (signal: NodeJS.Signals) => void;
}) => {
  let isTerminating = false;
  const beginTermination = (termination: McpRunTermination) => {
    if (isTerminating) {
      return;
    }
    const activeCall = getActiveCall();
    if (activeCall === undefined && termination.type === "beforeExit") {
      return;
    }
    isTerminating = true;
    if (activeCall !== undefined) {
      reportTermination({
        termination,
        activeCall,
        totalCalls,
        results,
        elapsedMs: Date.now() - startedAt,
      });
    }
    const cleanup = withTimeout(
      Promise.resolve().then(disposeHost),
      cleanupTimeout,
      () => new Error("MCP run cleanup timed out.")
    ).catch(() => undefined);
    if (termination.type === "signal") {
      void cleanup.finally(() => exitWithSignal(termination.signal));
    }
  };
  return {
    beforeExit: (exitCode: number) =>
      beginTermination({ type: "beforeExit", exitCode }),
    signal: (signal: NodeJS.Signals) =>
      beginTermination({ type: "signal", signal }),
  };
};

const installMcpRunTerminationHandlers = ({
  getActiveCall,
  totalCalls,
  results,
  startedAt,
  disposeHost,
  reportTermination = reportMcpRunTermination,
}: {
  getActiveCall: () => ActiveMcpRunCall | undefined;
  totalCalls: number;
  results: unknown[];
  startedAt: number;
  disposeHost: () => Promise<void>;
  reportTermination?: typeof reportMcpRunTermination;
}) => {
  const controller = createMcpRunTerminationController({
    getActiveCall,
    totalCalls,
    results,
    startedAt,
    disposeHost,
    reportTermination,
  });
  const terminationSignals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
  const signalHandlers = new Map<NodeJS.Signals, () => void>();
  const beforeExit = (exitCode: number) => {
    dispose();
    controller.beforeExit(exitCode);
  };
  const dispose = () => {
    process.off("beforeExit", beforeExit);
    for (const [signal, handler] of signalHandlers) {
      process.off(signal, handler);
    }
    signalHandlers.clear();
  };
  process.once("beforeExit", beforeExit);
  for (const signal of terminationSignals) {
    const handler = () => {
      dispose();
      controller.signal(signal);
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }
  return dispose;
};

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
  return isPlainRecord(result.structuredContent.error)
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

const createCliMcpHost = async ({
  projectRoot = cwd(),
  projectId,
  managePreviewProcessSignals = true,
}: {
  projectRoot?: string;
  projectId?: string;
  managePreviewProcessSignals?: boolean;
} = {}) => {
  const connection = await resolveApiConnection(
    undefined,
    projectRoot,
    projectId
  );
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
  let recentFailure: IssueReportRecentFailure | undefined;
  const session = createCliProjectSession({
    connection: apiConnection,
    projectRoot,
    sessionProjectId: projectId,
    issueReportRuntime: () => createIssueReportRuntime(recentFailure),
  });
  const restorePointStorage = createCliProjectRestorePointStorage(
    getCliProjectRestorePointsFile(projectRoot, projectId)
  );
  await prepareMcpProjectSession(session);
  const preview = createPreviewController(
    { host: "127.0.0.1", port: 5173 },
    undefined,
    { manageProcessSignals: managePreviewProcessSignals }
  );
  const previewFreshness = createPreviewFreshness();
  const previewHandlers = createMcpPreviewHandlers({
    preview,
    createCaptureSession: createScreenshotCaptureSession,
    isStale: previewFreshness.isStale,
    captureFreshness: previewFreshness.capture,
    markFresh: previewFreshness.markFresh,
    getProjectVersion: () => getLoadedProjectSessionSnapshot(session).version,
    getHttpCredentials: (pagePath) =>
      getProjectBasicAuthCredentials(
        getLoadedProjectSessionSnapshot(session).state.projectSettings?.meta
          .auth,
        pagePath
      ),
    prepareSessionDataFile: async () => {
      await writeCliProjectSessionPreviewDataFile({
        session,
        connection: apiConnection,
        path: path.join(projectRoot, LOCAL_DATA_FILE),
        assetsDirectory: path.join(projectRoot, LOCAL_ASSETS_DIR),
      });
    },
  });
  type ScreenshotResult = Awaited<
    ReturnType<typeof previewHandlers.captureScreenshot>
  >;
  type ResizedScreenshotResult = Awaited<
    ReturnType<typeof previewHandlers.capturePageScreenshots>
  >[number];
  const toProjectSessionScreenshotResult = (
    result: ScreenshotResult | ResizedScreenshotResult
  ) => {
    const navigation = result.navigation ?? result.layout?.navigation;
    return {
      output: result.output,
      browserPath: result.browser.path,
      browser: result.browser.browser,
      viewport: result.viewport,
      fullPage: result.fullPage,
      elapsedMs: result.elapsedMs,
      warnings: result.warnings,
      previewMode: result.previewMode,
      renderedProjectId: navigation?.projectId,
      renderedProjectVersion: navigation?.projectVersion,
      ...("lifecycleTimings" in result
        ? { lifecycleTimings: result.lifecycleTimings }
        : {}),
      navigation: result.navigation,
      layout: result.layout,
      timings: result.timings,
    };
  };
  const host: CliMcpHost = {
    operations,
    createProjectSession: () => session,
    onProjectSessionChange: previewFreshness.markStale,
    executeOperation: async ({ command, input, dryRun }) => {
      const operationInput = getMcpOperationInput(command, input);
      const textAssetFeedback = await prepareTextAssetWriteFeedback({
        command,
        input,
        operationInput,
        session,
      });
      const result = await executeProjectSessionApiOperation({
        command,
        input: operationInput,
        connection: apiConnection,
        createProjectSession: () => session,
        dryRun,
      });
      if (dryRun !== true && shouldInvalidatePreview(command)) {
        previewFreshness.markStale();
      }
      return withTextAssetWriteFeedback({
        command,
        input,
        operationInput,
        result,
        session,
        feedback: textAssetFeedback,
      });
    },
    restorePoints: {
      async create({ name }) {
        return await restorePointStorage.create(
          name,
          await session.captureRestorePointSnapshot()
        );
      },
      async list() {
        return { points: await restorePointStorage.list() };
      },
      async delete({ id }) {
        return { deleted: await restorePointStorage.delete(id) };
      },
      async revert({ id }, { dryRun }) {
        const restorePoint = await restorePointStorage.get(id);
        if (restorePoint === undefined) {
          throw Object.assign(new Error("Restore point not found"), {
            code: "NOT_FOUND",
          });
        }
        const result = await session.restoreSnapshot(restorePoint, { dryRun });
        if (dryRun !== true) {
          previewFreshness.markStale();
        }
        return result;
      },
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
            importProjectBundleWithAssets:
              httpClient.importProjectBundleWithAssets,
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
      previewFreshness.markStale();
      return { imported: true as const };
    },
    async downloadAsset(input) {
      const snapshot = getLoadedProjectSessionSnapshot(session);
      const asset = snapshot.state.assets?.get(input.assetId);
      if (asset === undefined) {
        throw new Error(`Asset not found: ${input.assetId}`);
      }
      assertTextAssetDescriptorFormats({
        assets: [asset as unknown as Record<string, unknown>],
        pathPrefix: ["asset"],
      });
      const localPath = getLocalAssetPath(asset.name, input.assetsDir);
      const format = getTextAssetFormat(asset.format);
      if (format !== undefined) {
        const temporaryDirectory = await mkdtemp(
          path.join(tmpdir(), "webstudio-asset-download-")
        );
        try {
          await downloadAssetFile({
            asset,
            assetsDirectory: temporaryDirectory,
            origin: connection.origin,
          });
          const remotePath = getLocalAssetPath(asset.name, temporaryDirectory);
          const { source, diagnostics } = await validateDownloadedTextAsset({
            assetId: asset.id,
            path: localPath,
            format,
            content: await readFile(remotePath),
            session,
          });
          await materializeValidatedDownloadedAsset({
            assetId: asset.id,
            remotePath,
            localPath,
            diagnostics,
          });
          return {
            assetId: asset.id,
            path: localPath,
            source,
            diagnostics,
          };
        } finally {
          await rm(temporaryDirectory, { recursive: true, force: true });
        }
      }
      await downloadAssetFile({
        asset,
        assetsDirectory: input.assetsDir,
        origin: connection.origin,
      });
      return {
        assetId: asset.id,
        path: localPath,
      };
    },
    async startPreview(input, progress) {
      const result = await startMcpPreview({
        input,
        startPreview: async (resolvedInput) =>
          await previewHandlers.startPreview(resolvedInput, progress),
      });
      if (
        result.running === false ||
        result.url === undefined ||
        result.mode === undefined
      ) {
        throw new Error("Preview server did not start.");
      }
      return {
        ...result,
        ...previewFreshness.status(),
        url: result.url,
        pid: result.pid,
        running: true,
        mode: result.mode,
      };
    },
    async getPreviewStatus() {
      return { ...preview.status(), ...previewFreshness.status() };
    },
    async stopPreview() {
      const result = await previewHandlers.stopPreview();
      return { ...result, ...previewFreshness.status() };
    },
    async captureScreenshot(input) {
      const resolvedInput = await resolveMcpScreenshotInput(
        input,
        preview.status()
      );
      const result = await previewHandlers.captureScreenshot(resolvedInput);
      return toProjectSessionScreenshotResult(result);
    },
    async capturePageScreenshots(inputs) {
      const firstInput = inputs[0];
      if (firstInput === undefined) {
        return [];
      }
      const resolvedFirstInput = await resolveMcpScreenshotInput(
        firstInput,
        preview.status()
      );
      const resolvedInputs = inputs.map((input) => ({
        ...input,
        port: resolvedFirstInput.port,
      }));
      const results =
        await previewHandlers.capturePageScreenshots(resolvedInputs);
      return results.map(toProjectSessionScreenshotResult);
    },
    async diffScreenshots(input) {
      return diffPngFiles(input);
    },
    async installOcr() {
      return installTesseractForOcr();
    },
    async storeRenderedAuditArtifacts(manifest) {
      const directory = path.join(projectRoot, renderedAuditArtifactDirectory);
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
    scope: { projectRoot, projectId } satisfies McpProjectScope,
    session,
    host,
    apiContract,
    toolCount: operations.length,
    recordToolFailure(canonicalTool: string, error: unknown) {
      recentFailure = createIssueReportFailure(canonicalTool, error);
    },
    reportLog(message: string) {
      if (message.startsWith("ready with ")) {
        return;
      }
      stderr.write(`${formatMcpStatusLine(message)}\n`);
    },
    async dispose() {
      await previewHandlers.stopPreview();
    },
  };
};

const createCliMcpCore = (host: CliMcpHost) =>
  createProjectSessionMcpCore({
    ...host,
    reportToolProgress(message) {
      stderr.write(`${formatMcpStatusLine(message)}\n`);
    },
  });

const withMcpHost = async <
  Host extends { dispose: () => Promise<void> },
  Result,
>(
  createHost: () => Promise<Host>,
  callback: (host: Host) => Promise<Result>
) => {
  const host = await createHost();
  try {
    return await callback(host);
  } finally {
    await host.dispose().catch(() => undefined);
  }
};

type CliMcpCore = ReturnType<
  typeof createProjectSessionMcpCore<PublicApiCommand>
>;

const assertMcpToolServerSupport = (
  tool: string,
  contract: CliServerApiContract
) => {
  const operation = publicApiOperationByCommand.get(tool as PublicApiCommand);
  if (
    operation !== undefined &&
    publicApiOperationRequiresServerSupport(operation)
  ) {
    assertCliServerOperationSupported(operation.id, contract);
  }
};

const executeMcpRunCall = async ({
  core,
  call,
  scope,
}: {
  core: CliMcpCore;
  call: McpRunCall;
  scope?: McpProjectScope;
}) => {
  await assertPersistedMcpCheckpointAcknowledged(
    call.tool,
    core.listTools(),
    scope
  );
  const result = await core.callTool({
    name: call.tool,
    input: call.input,
    dryRun: call.dryRun,
  });
  const toolError = getMcpToolCallError(result);
  if (toolError !== undefined) {
    throw toolError;
  }
  const checkpoint = getResultCheckpoint(call.tool, result.structuredContent);
  await updatePersistedMcpCheckpoint({
    tool: call.tool,
    structuredContent: result.structuredContent,
    scope,
  });
  return { result, checkpoint };
};

export const mcpSingleOpCall = async (options: McpSingleOpCallOptions) => {
  if (options.tool === undefined || options.tool === "") {
    throw new Error("mcp single-op-call requires a tool name.");
  }
  const tool = options.tool;
  const startedAt = Date.now();
  stderr.write(
    `${formatMcpStatusLine(
      `single-op-call ${tool} started${options.dryRun === true ? " (dry run)" : ""}`
    )}\n`
  );
  let activeCall: ActiveMcpRunCall | undefined = { number: 1, tool };
  let didTerminate = false;
  let disposeHost: () => Promise<void> = async () => undefined;
  const disposeTerminationHandlers = installMcpRunTerminationHandlers({
    getActiveCall: () => activeCall,
    totalCalls: 1,
    results: [],
    startedAt,
    disposeHost: () => disposeHost(),
    reportTermination: ({ termination, activeCall, elapsedMs }) => {
      didTerminate = true;
      reportMcpSingleOpCallTermination({
        termination,
        tool: activeCall.tool,
        elapsedMs,
      });
    },
  });
  try {
    assertSingleOpCallToolSupported(tool);
    const input = await parseMcpSingleOpCallInput(options);
    validateSingleOpCallInput(tool, input);
    if (didTerminate) {
      throw new HandledCliError();
    }
    await withMcpHost(
      async () => {
        const mcpHost = await createCliMcpHost({ projectId: options.project });
        disposeHost = mcpHost.dispose;
        if (didTerminate) {
          throw new HandledCliError();
        }
        return mcpHost;
      },
      async ({ host, apiContract, scope }) => {
        assertMcpToolServerSupport(tool, apiContract);
        const core = createCliMcpCore(host);
        const persistedCheckpoint =
          tool === "checkpoint.ack"
            ? await readPersistedMcpCheckpoint(scope)
            : undefined;
        if (didTerminate) {
          throw new HandledCliError();
        }
        await assertPersistedMcpCheckpointAcknowledged(
          tool,
          core.listTools(),
          scope
        );
        if (didTerminate) {
          throw new HandledCliError();
        }
        if (options.refresh === true && tool !== "refresh") {
          await core.callTool({ name: "refresh" });
          if (didTerminate) {
            throw new HandledCliError();
          }
        }
        const result = await core.callTool({
          name: tool,
          input,
          dryRun: options.dryRun,
        });
        if (didTerminate) {
          throw new HandledCliError();
        }
        if (isMcpToolCallFailure(result)) {
          activeCall = undefined;
          stderr.write(
            `${formatMcpStatusLine(
              `single-op-call ${tool} failed in ${Date.now() - startedAt}ms`
            )}\n`
          );
          printJson(result.structuredContent);
          throw new HandledCliError();
        }
        if (
          tool === "checkpoint.ack" &&
          persistedCheckpoint?.nextCommand !== undefined &&
          isPlainRecord(result.structuredContent.data)
        ) {
          result.structuredContent.data.nextCommand =
            persistedCheckpoint.nextCommand;
        }
        await updatePersistedMcpCheckpoint({
          tool,
          structuredContent: result.structuredContent,
          scope,
        });
        if (didTerminate) {
          throw new HandledCliError();
        }
        const session = result.structuredContent.meta.session;
        const committed =
          session === undefined ? "" : `; committed=${session.committed}`;
        activeCall = undefined;
        stderr.write(
          `${formatMcpStatusLine(
            `single-op-call ${tool} succeeded in ${Date.now() - startedAt}ms${committed}`
          )}\n`
        );
        if (options.printSuccess === undefined) {
          printJson(result.structuredContent);
        } else {
          options.printSuccess(result.structuredContent.data);
        }
      }
    );
  } catch (error) {
    activeCall = undefined;
    if (didTerminate) {
      throw new HandledCliError();
    }
    if (isHandledCliError(error)) {
      throw error;
    }
    const payload = createMcpSingleOpCallErrorPayload({
      error,
      elapsedMs: Date.now() - startedAt,
    });
    stderr.write(
      `${formatMcpStatusLine(
        `single-op-call ${tool} failed in ${payload.meta.elapsedMs}ms: ${payload.error.message}`
      )}\n`
    );
    printJson(payload);
    throw new HandledCliError();
  } finally {
    activeCall = undefined;
    disposeTerminationHandlers();
  }
};

class McpRunCheckpointStop extends Error {}

const runMcpProjectsBatch = async ({
  source,
  options,
  startedAt,
}: {
  source: Awaited<ReturnType<typeof readMcpRunInput>>;
  options: McpRunOptions;
  startedAt: number;
}) => {
  const manifest = parseMcpProjectsManifest({
    value: source.value,
    baseDirectory: source.baseDirectory,
    defaultProgressDirectory: cwd(),
    parseCalls: (value) => applyMcpRunOptions(parseMcpRunCalls(value), options),
    concurrency: options.concurrency,
  });
  stderr.write(
    `${formatMcpStatusLine(
      `batch started for ${manifest.projects.length} projects with concurrency ${manifest.concurrency}`
    )}\n`
  );
  const reports = await runMcpProjectBatch({
    manifest,
    resume: options.resume !== false,
    runProject: async ({ project, startCall, callStarted, callSucceeded }) => {
      stderr.write(
        `${formatMcpStatusLine(
          `batch project ${project.id} started at call ${startCall + 1}/${project.calls.length}`
        )}\n`
      );
      await withMcpHost(
        () => createCliMcpHost({ projectRoot: project.root }),
        async ({ host, apiContract }) => {
          const core = createCliMcpCore(host);
          const tools = new Map(
            core.listTools().map((tool) => [tool.name, tool])
          );
          for (const call of project.calls.slice(startCall)) {
            assertMcpToolServerSupport(call.tool, apiContract);
            const tool = tools.get(call.tool);
            assertMcpBatchMutationApproved({
              projectId: project.id,
              call,
              method: tool?.annotations.method,
              approved: options.approveMutations === true,
            });
          }
          for (let index = startCall; index < project.calls.length; index++) {
            const call = project.calls[index]!;
            const tool = tools.get(call.tool);
            await callStarted(
              index,
              call.dryRun || tool?.annotations.method !== "mutation"
            );
            const { checkpoint } = await executeMcpRunCall({
              core,
              call,
              scope: { projectRoot: project.root },
            });
            await callSucceeded(index + 1);
            const nextTool = project.calls[index + 1]?.tool;
            if (
              checkpoint !== undefined &&
              index + 1 < project.calls.length &&
              (nextTool === undefined ||
                isReadOnlyProjectSessionMcpToolCall(
                  nextTool,
                  core.listTools()
                ) === false)
            ) {
              throw createMcpInputError(
                checkpoint.message,
                "CHECKPOINT_REQUIRED"
              );
            }
          }
        }
      );
    },
  });
  const succeeded = reports.filter(
    (report) => report.status === "succeeded"
  ).length;
  const skipped = reports.filter(
    (report) => report.status === "skipped"
  ).length;
  const failed = reports.length - succeeded - skipped;
  const payload = {
    ok: failed === 0,
    data: {
      projects: {
        total: reports.length,
        succeeded,
        failed,
        skipped,
      },
      results: reports,
      progressFile: manifest.progressFile,
    },
    meta: { elapsedMs: Date.now() - startedAt },
  };
  stderr.write(
    `${formatMcpStatusLine(
      `batch finished: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`
    )}\n`
  );
  printJson(payload);
  if (failed > 0) {
    throw new HandledCliError();
  }
};

export const mcpRun = async (options: McpRunOptions) => {
  const startedAt = Date.now();
  let calls: McpRunCall[];
  try {
    const source = await readMcpRunInput(options.input);
    if (isMcpProjectsManifest(source.value)) {
      await runMcpProjectsBatch({ source, options, startedAt });
      return;
    }
    calls = parseMcpRunCalls(source.value);
  } catch (error) {
    if (isHandledCliError(error)) {
      throw error;
    }
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
  let scope: McpProjectScope = {};
  let disposeHost: () => Promise<void> = async () => undefined;
  try {
    const mcpHost = await createCliMcpHost({
      projectId: options.project,
      managePreviewProcessSignals: false,
    });
    const { host, apiContract } = mcpHost;
    disposeHost = mcpHost.dispose;
    scope = mcpHost.scope;
    for (const call of calls) {
      assertMcpToolServerSupport(call.tool, apiContract);
    }
    core = createCliMcpCore(host);
  } catch (error) {
    await disposeHost().catch(() => undefined);
    reportMcpRunPreflightFailure({
      error,
      startedAt,
      totalCalls: calls.length,
    });
    throw new HandledCliError();
  }
  let activeCall: ActiveMcpRunCall | undefined;
  const disposeTerminationHandlers = installMcpRunTerminationHandlers({
    getActiveCall: () => activeCall,
    totalCalls: calls.length,
    results,
    startedAt,
    disposeHost: () => disposeHost(),
  });
  try {
    for (const [index, call] of calls.entries()) {
      const callNumber = index + 1;
      activeCall = { number: callNumber, tool: call.tool };
      stderr.write(
        `${formatMcpStatusLine(
          `run ${callNumber}/${calls.length} ${call.tool} started${call.dryRun ? " (dry run)" : ""}`
        )}\n`
      );
      try {
        const { result, checkpoint } = await executeMcpRunCall({
          core,
          call,
          scope,
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
        activeCall = undefined;
        const nextTool = calls[callNumber]?.tool;
        if (
          checkpoint !== undefined &&
          callNumber < calls.length &&
          (nextTool === undefined ||
            isReadOnlyProjectSessionMcpToolCall(nextTool, core.listTools()) ===
              false)
        ) {
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
        activeCall = undefined;
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
  } finally {
    disposeTerminationHandlers();
    await disposeHost().catch(() => undefined);
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

export const mcpListTools = async (options: McpListToolsOptions) => {
  const startedAt = Date.now();
  stderr.write(`${formatMcpStatusLine("list-tools started")}\n`);
  const { host } = await createCliMcpHost({ projectId: options.project });
  const core = createCliMcpCore(host);
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

export const mcpListResources = async (options: McpListResourcesOptions) => {
  const startedAt = Date.now();
  const { host } = await createCliMcpHost({ projectId: options.project });
  const core = createCliMcpCore(host);
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
    const { host } = await createCliMcpHost({ projectId: options.project });
    const core = createCliMcpCore(host);
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

export const mcp = async (
  options: {
    project?: string;
    toolNameFormat?: "canonical" | "underscores";
  } = {}
) => {
  const status = createMcpStatusReporter();
  let didReportClose = false;
  let disposeHost: () => Promise<void> = async () => undefined;
  const reportClose = () => {
    if (didReportClose) {
      return;
    }
    didReportClose = true;
    status.connectionClosed();
    void disposeHost().catch((error: unknown) => {
      status.connectionError(
        error instanceof Error ? error : new Error(String(error))
      );
    });
  };
  stdin.once("end", reportClose);
  stdin.once("close", reportClose);
  status.starting();
  const {
    host,
    toolCount,
    reportLog,
    recordToolFailure,
    apiContract,
    dispose,
  } = await createCliMcpHost({
    projectId: options.project,
  });
  disposeHost = dispose;
  if (didReportClose) {
    await disposeHost().catch(() => undefined);
    return;
  }
  status.sessionReady();
  status.apiContract(apiContract);
  status.ready(toolCount);
  const server = await connectProjectSessionMcpServer({
    ...host,
    toolNameFormat: options.toolNameFormat,
    getErrorCode: getStableErrorCode,
    onToolFailure: recordToolFailure,
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

export const __testing__ = {
  createMcpStatusReporter,
  formatMcpStatusLine,
  assertSingleOpCallToolSupported,
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
  reportMcpSingleOpCallTermination,
  reportMcpRunTermination,
  createMcpRunTerminationController,
  createMcpRunCheckpointStopPayload,
  getLoadedProjectSessionSnapshot,
  getMcpOperationInput,
  prepareTextAssetWriteFeedback,
  withTextAssetWriteFeedback,
  validateDownloadedTextAsset,
  materializeValidatedDownloadedAsset,
  parseMcpSingleOpCallInput,
  validateSingleOpCallInput,
  isMcpToolCallFailure,
  getMcpToolCallError,
  applyMcpRunOptions,
  parseMcpRunCalls,
  parseMcpRunInput,
  executeMcpRunCall,
  withMcpHost,
};
