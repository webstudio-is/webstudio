import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import path from "node:path";
import {
  getProjectSessionMcpCheckpoint,
  isReadOnlyProjectSessionMcpToolCall,
  type ProjectSessionMcpTool,
} from "@webstudio-is/project-build/mcp";
import { getLocalProjectStateDirectory } from "../config";
import { isPlainRecord } from "../type-utils";

const checkpointFilename = "mcp-checkpoint.json";

export type PersistedMcpCheckpoint = {
  tool: string;
  message: string;
  nextCommand?: string;
};

export type McpProjectScope = {
  projectRoot?: string;
  projectId?: string;
};

const getMcpCheckpointPath = ({
  projectRoot = cwd(),
  projectId,
}: McpProjectScope = {}) =>
  path.join(
    getLocalProjectStateDirectory(projectRoot, projectId),
    checkpointFilename
  );

export const readPersistedMcpCheckpoint = async (
  scope: McpProjectScope = {}
) => {
  try {
    return JSON.parse(
      await readFile(getMcpCheckpointPath(scope), "utf8")
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
  scope: McpProjectScope = {}
) => {
  const checkpointPath = getMcpCheckpointPath(scope);
  await mkdir(path.dirname(checkpointPath), { recursive: true });
  await writeFile(checkpointPath, JSON.stringify(checkpoint, undefined, 2));
};

export const clearPersistedMcpCheckpoint = async (
  scope: McpProjectScope = {}
) => {
  await rm(getMcpCheckpointPath(scope), { force: true });
};

export const assertPersistedMcpCheckpointAcknowledged = async (
  tool: string,
  tools: readonly ProjectSessionMcpTool[],
  scope: McpProjectScope = {}
) => {
  if (
    tool === "checkpoint.ack" ||
    isReadOnlyProjectSessionMcpToolCall(tool, tools)
  ) {
    return;
  }
  const checkpoint = await readPersistedMcpCheckpoint(scope);
  if (checkpoint === undefined) {
    return;
  }
  throw Object.assign(
    new Error(
      `CHECKPOINT_REQUIRED: ${checkpoint.message} Stop now and report the previous checkpoint to the parent/user. Only after the parent/user continues, call checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"} before calling "${tool}".`
    ),
    { code: "CHECKPOINT_REQUIRED" }
  );
};

export const getResultCheckpoint = (
  tool: string,
  structuredContent: unknown
) => {
  if (isPlainRecord(structuredContent) === false) {
    return;
  }
  return getProjectSessionMcpCheckpoint(tool, structuredContent.data);
};

export const updatePersistedMcpCheckpoint = async ({
  tool,
  structuredContent,
  scope = {},
}: {
  tool: string;
  structuredContent: unknown;
  scope?: McpProjectScope;
}) => {
  if (tool === "checkpoint.ack") {
    await clearPersistedMcpCheckpoint(scope);
    return;
  }
  const checkpoint = getResultCheckpoint(tool, structuredContent);
  if (checkpoint !== undefined) {
    await writePersistedMcpCheckpoint(checkpoint, scope);
  }
};
