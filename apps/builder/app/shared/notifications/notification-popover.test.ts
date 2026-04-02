import { describe, test, expect } from "vitest";
import { notification } from "@webstudio-is/project/index.server";
import type { WorkspaceInvitePayload } from "@webstudio-is/project";

const { describeNotification } = notification.__testing__;

describe("describeNotification", () => {
  test("workspace invite with all info", () => {
    const result = describeNotification({
      type: "workspaceInvite",
      senderLabel: "Alice",
      workspaceName: "Design team",
      invite: { workspaceId: "ws-1", relation: "viewers" },
    });
    expect(result).toBe('Alice invited you to "Design team" as viewer');
  });

  test("workspace invite with admin relation", () => {
    const result = describeNotification({
      type: "workspaceInvite",
      senderLabel: "Alice",
      workspaceName: "Design team",
      invite: {
        workspaceId: "ws-1",
        relation: "administrators",
      } satisfies WorkspaceInvitePayload,
    });
    expect(result).toBe('Alice invited you to "Design team" as admin');
  });

  test("workspace invite without workspace name", () => {
    const result = describeNotification({
      type: "workspaceInvite",
      senderLabel: "Alice",
      invite: { workspaceId: "ws-1", relation: "viewers" },
    });
    expect(result).toBe('Alice invited you to "a workspace" as viewer');
  });

  test("workspace invite without parsed invite falls back to generic", () => {
    const result = describeNotification({
      type: "workspaceInvite",
      senderLabel: "Alice",
    });
    expect(result).toBe("You have a new notification");
  });

  test("project transfer with project title", () => {
    const result = describeNotification({
      type: "projectTransfer",
      senderLabel: "Alice",
      projectTitle: "My Website",
    });
    expect(result).toBe('Alice wants to transfer "My Website" to you');
  });

  test("project transfer without project title", () => {
    const result = describeNotification({
      type: "projectTransfer",
      senderLabel: "Alice",
    });
    expect(result).toBe('Alice wants to transfer "a project" to you');
  });

  test("sender label from email fallback", () => {
    const result = describeNotification({
      type: "projectTransfer",
      senderLabel: "alice@example.com",
      projectTitle: "My Website",
    });
    expect(result).toBe(
      'alice@example.com wants to transfer "My Website" to you'
    );
  });

  test("unknown type returns generic message", () => {
    const result = describeNotification({
      type: "someFutureType",
      senderLabel: "Alice",
    });
    expect(result).toBe("You have a new notification");
  });
});
