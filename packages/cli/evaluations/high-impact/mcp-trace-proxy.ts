// Proxies MCP stdio traffic for an evaluation while recording the bounded,
// sanitized request evidence needed by structured outcome validation.
import { appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { boundedIdentifierPattern, isPlainRecord } from "../../src/type-utils";
import type { McpCatalogObservation } from "./evaluation-metrics";
import {
  getAssetQueryContractFingerprints,
  getPageSettingsContractFingerprint,
} from "./evaluation-trace-contract";

type JsonRpcId = string | number;

export type BoundedMcpCall = {
  name: string;
  arguments?: {
    path?: string;
    viewport?: { width: number; height: number };
    viewports?: Array<{ width: number; height: number }>;
    dryRun?: true;
    confirmDestructive?: true;
    hasConfirmationToken?: true;
    assetQuerySha256?: string;
    assetQueryShapeSha256?: string;
    pageSettingsSha256?: string;
  };
  startedAtMs: number;
  durationMs?: number;
  responseBytes?: number;
  mutation?: true;
  planned?: true;
  committed?: true;
  isError?: true;
  errorCode?: string;
  errorIssues?: Array<{ code: string; path: string }>;
};

const getBoundedRoutePath = (value: unknown) => {
  if (typeof value !== "string" || value.length > 256) {
    return;
  }
  try {
    const url = new URL(value, "https://evaluation.invalid");
    if (url.origin === "https://evaluation.invalid" && value === url.pathname) {
      return url.pathname;
    }
  } catch {
    return;
  }
};

const getStructuredError = (result: unknown) => {
  const structuredContent =
    isPlainRecord(result) && isPlainRecord(result.structuredContent)
      ? result.structuredContent
      : undefined;
  return structuredContent !== undefined &&
    isPlainRecord(structuredContent.error)
    ? structuredContent.error
    : undefined;
};

const getBoundedErrorCode = (value: unknown, result: unknown) => {
  const error = getStructuredError(result);
  if (
    typeof error?.code === "string" &&
    boundedIdentifierPattern.test(error.code)
  ) {
    return error.code;
  }
  if (isPlainRecord(value) && isPlainRecord(value.error)) {
    const code = value.error.code;
    if (typeof code === "number" && Number.isSafeInteger(code)) {
      return `JSON_RPC_${code}`;
    }
    if (typeof code === "string" && boundedIdentifierPattern.test(code)) {
      return code;
    }
  }
};

const getBoundedErrorIssues = (result: unknown) => {
  const issues = getStructuredError(result)?.issues;
  if (Array.isArray(issues) === false) {
    return;
  }
  const boundedIssues = issues.slice(0, 8).flatMap((issue) => {
    if (
      isPlainRecord(issue) === false ||
      typeof issue.code !== "string" ||
      boundedIdentifierPattern.test(issue.code) === false ||
      Array.isArray(issue.path) === false ||
      issue.path.length > 8
    ) {
      return [];
    }
    const segments = issue.path.map(String);
    if (
      segments.some(
        (segment) => boundedIdentifierPattern.test(segment) === false
      )
    ) {
      return [];
    }
    return [{ code: issue.code, path: segments.join(".") }];
  });
  return boundedIssues.length === 0 ? undefined : boundedIssues;
};

export const getMcpTraceRequest = (
  value: unknown,
  startedAtMs = 0,
  mutationToolNames: ReadonlySet<string> = new Set()
) => {
  if (isPlainRecord(value) === false || value.method !== "tools/call") {
    return;
  }
  const id = value.id;
  const params = value.params;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    isPlainRecord(params) === false ||
    typeof params.name !== "string" ||
    boundedIdentifierPattern.test(params.name) === false
  ) {
    return;
  }
  const call: BoundedMcpCall = {
    name: params.name,
    startedAtMs: Math.round(startedAtMs),
    ...(mutationToolNames.has(params.name) ? { mutation: true as const } : {}),
  };
  if (isPlainRecord(params.arguments)) {
    const args: NonNullable<BoundedMcpCall["arguments"]> = {};
    if (params.name === "verify-page-responsive") {
      const path = getBoundedRoutePath(params.arguments.path);
      if (path !== undefined) {
        args.path = path;
      }
    }
    const viewport = params.arguments.viewport;
    if (
      params.name === "screenshot" &&
      isPlainRecord(viewport) &&
      typeof viewport.width === "number" &&
      typeof viewport.height === "number"
    ) {
      args.viewport = { width: viewport.width, height: viewport.height };
    }
    const viewports = params.arguments.viewports;
    if (
      (params.name === "screenshot.responsive" ||
        params.name === "verify-page-responsive") &&
      Array.isArray(viewports) &&
      viewports.length > 0 &&
      viewports.length <= 8 &&
      viewports.every(
        (item) =>
          isPlainRecord(item) &&
          typeof item.width === "number" &&
          typeof item.height === "number"
      )
    ) {
      args.viewports = viewports.map((item) => ({
        width: item.width as number,
        height: item.height as number,
      }));
    }
    if (params.arguments.dryRun === true) {
      args.dryRun = true;
    }
    if (params.arguments.confirmDestructive === true) {
      args.confirmDestructive = true;
    }
    if (typeof params.arguments.confirmationToken === "string") {
      args.hasConfirmationToken = true;
    }
    if (
      params.name === "validate-asset-query" ||
      params.name === "preview-asset-query"
    ) {
      const fingerprints = getAssetQueryContractFingerprints(
        params.arguments.query
      );
      if (fingerprints !== undefined) {
        args.assetQuerySha256 = fingerprints.sha256;
        args.assetQueryShapeSha256 = fingerprints.shapeSha256;
      }
    }
    if (params.name === "update-page") {
      const pageSettingsSha256 = getPageSettingsContractFingerprint(
        params.arguments
      );
      if (pageSettingsSha256 !== undefined) {
        args.pageSettingsSha256 = pageSettingsSha256;
      }
    }
    if (Object.keys(args).length > 0) {
      call.arguments = args;
    }
  }
  return { id, call };
};

export const getMcpTraceResponse = (
  value: unknown,
  pending: Map<JsonRpcId, BoundedMcpCall>,
  completedAtMs = 0
) => {
  if (isPlainRecord(value) === false) {
    return;
  }
  const id = value.id;
  if (typeof id !== "string" && typeof id !== "number") {
    return;
  }
  const call = pending.get(id);
  if (call === undefined) {
    return;
  }
  pending.delete(id);
  const result = value.result;
  const isError =
    value.error !== undefined ||
    (isPlainRecord(result) && result.isError === true)
      ? (true as const)
      : undefined;
  const errorCode =
    isError === true ? getBoundedErrorCode(value, result) : undefined;
  const errorIssues =
    isError === true ? getBoundedErrorIssues(result) : undefined;
  const structuredContent =
    isPlainRecord(result) && isPlainRecord(result.structuredContent)
      ? result.structuredContent
      : undefined;
  const meta =
    structuredContent !== undefined && isPlainRecord(structuredContent.meta)
      ? structuredContent.meta
      : undefined;
  const session =
    meta !== undefined && isPlainRecord(meta.session)
      ? meta.session
      : undefined;
  const committed =
    call.mutation === true && session?.committed === true
      ? (true as const)
      : undefined;
  const planned =
    call.mutation === true &&
    session?.source === "dry-run" &&
    session.transaction !== undefined
      ? (true as const)
      : undefined;
  return {
    ...call,
    durationMs: Math.max(0, Math.round(completedAtMs - call.startedAtMs)),
    responseBytes: getJsonBytes(value),
    ...(planned === undefined ? {} : { planned }),
    ...(committed === undefined ? {} : { committed }),
    ...(isError === undefined ? {} : { isError }),
    ...(errorCode === undefined ? {} : { errorCode }),
    ...(errorIssues === undefined ? {} : { errorIssues }),
  };
};

export const getMcpToolsListRequestId = (value: unknown) => {
  if (isPlainRecord(value) === false || value.method !== "tools/list") {
    return;
  }
  return typeof value.id === "string" || typeof value.id === "number"
    ? value.id
    : undefined;
};

export const getMcpMutationToolNames = (value: unknown) => {
  if (
    isPlainRecord(value) === false ||
    isPlainRecord(value.result) === false ||
    Array.isArray(value.result.tools) === false
  ) {
    return;
  }
  return value.result.tools.flatMap((tool) => {
    if (
      isPlainRecord(tool) &&
      typeof tool.name === "string" &&
      (isPlainRecord(tool.annotations) === false ||
        tool.annotations.readOnlyHint !== true)
    ) {
      return [tool.name];
    }
    return [];
  });
};

const getJsonBytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), "utf8");

export const getMcpCatalogObservation = (
  value: unknown
): McpCatalogObservation | undefined => {
  if (
    isPlainRecord(value) === false ||
    isPlainRecord(value.result) === false ||
    Array.isArray(value.result.tools) === false
  ) {
    return;
  }
  const tools = value.result.tools;
  return {
    kind: "tools-list",
    toolCount: tools.length,
    responseBytes: getJsonBytes(value.result),
    inputSchemaBytes: tools.reduce(
      (total, tool) =>
        total +
        (isPlainRecord(tool) && tool.inputSchema !== undefined
          ? getJsonBytes(tool.inputSchema)
          : 0),
      0
    ),
    descriptionBytes: tools.reduce(
      (total, tool) =>
        total +
        (isPlainRecord(tool) && typeof tool.description === "string"
          ? Buffer.byteLength(tool.description, "utf8")
          : 0),
      0
    ),
  };
};

const observeJsonLines = (
  stream: NodeJS.ReadableStream,
  visit: (value: unknown) => void
) => {
  let buffered = "";
  stream.on("data", (chunk) => {
    buffered += String(chunk);
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      try {
        visit(JSON.parse(line));
      } catch {}
    }
  });
};

const run = () => {
  const [, , target, tracePath] = process.argv;
  if (target === undefined || tracePath === undefined) {
    throw new Error("Expected target CLI and trace file paths.");
  }
  const pending = new Map<JsonRpcId, BoundedMcpCall>();
  const pendingToolsLists = new Set<JsonRpcId>();
  const mutationToolNames = new Set<string>();
  const startedAt = performance.now();
  const child = spawn(process.execPath, [target, "mcp"], {
    env: process.env,
    stdio: ["pipe", "pipe", "inherit"],
  });
  observeJsonLines(process.stdin, (value) => {
    const toolsListId = getMcpToolsListRequestId(value);
    if (toolsListId !== undefined) {
      pendingToolsLists.add(toolsListId);
    }
    const request = getMcpTraceRequest(
      value,
      performance.now() - startedAt,
      mutationToolNames
    );
    if (request !== undefined) {
      pending.set(request.id, request.call);
    }
  });
  observeJsonLines(child.stdout, (value) => {
    if (
      isPlainRecord(value) &&
      (typeof value.id === "string" || typeof value.id === "number") &&
      pendingToolsLists.delete(value.id)
    ) {
      const catalog = getMcpCatalogObservation(value);
      if (catalog !== undefined) {
        appendFileSync(tracePath, `${JSON.stringify(catalog)}\n`, "utf8");
      }
      for (const name of getMcpMutationToolNames(value) ?? []) {
        mutationToolNames.add(name);
      }
    }
    const call = getMcpTraceResponse(
      value,
      pending,
      performance.now() - startedAt
    );
    if (call !== undefined) {
      appendFileSync(tracePath, `${JSON.stringify(call)}\n`, "utf8");
    }
  });
  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);
  child.on("exit", (code, signal) => {
    if (signal !== null) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run();
}
