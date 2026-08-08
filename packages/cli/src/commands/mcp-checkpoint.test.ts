import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { listProjectSessionMcpTools } from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/protocol";
import {
  assertPersistedMcpCheckpointAcknowledged,
  readPersistedMcpCheckpoint,
  updatePersistedMcpCheckpoint,
} from "./mcp-checkpoint";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

test("persists and acknowledges MCP checkpoints", async () => {
  const tools = listProjectSessionMcpTools(publicApiOperations);
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-checkpoint-"));
  tempDirs.push(dir);

  await updatePersistedMcpCheckpoint({
    tool: "components.coverage-plan",
    scope: { projectRoot: dir },
    structuredContent: {
      data: {
        checkpoint: {
          required: true,
          instruction:
            "Stop after this coverage-plan response and report before continuing.",
          nextCommand:
            'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\'',
        },
      },
    },
  });

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir })
  ).resolves.toEqual({
    tool: "components.coverage-plan",
    message:
      "Stop after this coverage-plan response and report before continuing.",
    nextCommand:
      'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\'',
  });
  await expect(
    assertPersistedMcpCheckpointAcknowledged("components.get", tools, {
      projectRoot: dir,
    })
  ).resolves.toBeUndefined();
  await expect(
    assertPersistedMcpCheckpointAcknowledged("create-page", tools, {
      projectRoot: dir,
    })
  ).rejects.toMatchObject({
    code: "CHECKPOINT_REQUIRED",
    message: expect.stringContaining("CHECKPOINT_REQUIRED"),
  });
  await expect(
    assertPersistedMcpCheckpointAcknowledged("checkpoint.ack", tools, {
      projectRoot: dir,
    })
  ).resolves.toBeUndefined();

  await updatePersistedMcpCheckpoint({
    tool: "checkpoint.ack",
    scope: { projectRoot: dir },
    structuredContent: { data: { acknowledged: true } },
  });

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir })
  ).resolves.toBeUndefined();
  await expect(
    assertPersistedMcpCheckpointAcknowledged("create-page", tools, {
      projectRoot: dir,
    })
  ).resolves.toBeUndefined();
});

test("isolates persisted MCP checkpoints by project", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-projects-"));
  tempDirs.push(dir);
  await updatePersistedMcpCheckpoint({
    tool: "workflow.next",
    scope: { projectRoot: dir, projectId: "project-a" },
    structuredContent: {
      data: { checkpoint: { required: true, instruction: "Report project A" } },
    },
  });

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir, projectId: "project-a" })
  ).resolves.toEqual(expect.objectContaining({ message: "Report project A" }));
  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir, projectId: "project-b" })
  ).resolves.toBeUndefined();
});

test("persists the checkpoint producer tool name", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "webstudio-mcp-checkpoint-"));
  tempDirs.push(dir);

  await updatePersistedMcpCheckpoint({
    tool: "future.checkpoint-tool",
    scope: { projectRoot: dir },
    structuredContent: {
      data: {
        checkpoint: {
          required: true,
          instruction: "Report this future checkpoint before continuing.",
        },
      },
    },
  });

  await expect(
    readPersistedMcpCheckpoint({ projectRoot: dir })
  ).resolves.toMatchObject({ tool: "future.checkpoint-tool" });
});
