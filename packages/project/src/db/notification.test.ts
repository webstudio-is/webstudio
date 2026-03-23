import { describe, test, expect } from "vitest";
import { __testing__ } from "./notification";

const { describeNotification } = __testing__;

describe("describeNotification", () => {
  test("workspace invite with workspace name and relation", () => {
    expect(
      describeNotification({
        type: "workspaceInvite",
        senderLabel: "Alice",
        workspaceName: "Design Team",
        invite: { workspaceId: "ws-1", relation: "editors" },
      })
    ).toBe('Alice invited you to "Design Team" as editor');
  });

  test("workspace invite without workspace name falls back", () => {
    expect(
      describeNotification({
        type: "workspaceInvite",
        senderLabel: "Bob",
        workspaceName: undefined,
        invite: { workspaceId: "ws-1", relation: "viewers" },
      })
    ).toBe('Bob invited you to "a workspace" as viewer');
  });

  test("workspace invite with administrators relation", () => {
    expect(
      describeNotification({
        type: "workspaceInvite",
        senderLabel: "Carol",
        workspaceName: "Acme",
        invite: { workspaceId: "ws-1", relation: "administrators" },
      })
    ).toBe('Carol invited you to "Acme" as admin');
  });

  test("workspace invite with builders relation", () => {
    expect(
      describeNotification({
        type: "workspaceInvite",
        senderLabel: "Dave",
        workspaceName: "Studio",
        invite: { workspaceId: "ws-1", relation: "builders" },
      })
    ).toBe('Dave invited you to "Studio" as builder');
  });

  test("workspace invite type without invite payload returns generic", () => {
    expect(
      describeNotification({
        type: "workspaceInvite",
        senderLabel: "Eve",
      })
    ).toBe("You have a new notification");
  });

  test("project transfer with project title", () => {
    expect(
      describeNotification({
        type: "projectTransfer",
        senderLabel: "Frank",
        projectTitle: "My Portfolio",
      })
    ).toBe('Frank wants to transfer "My Portfolio" to you');
  });

  test("project transfer without project title falls back", () => {
    expect(
      describeNotification({
        type: "projectTransfer",
        senderLabel: "Grace",
        projectTitle: undefined,
      })
    ).toBe('Grace wants to transfer "a project" to you');
  });

  test("unknown type returns generic message", () => {
    expect(
      describeNotification({
        type: "unknownType",
        senderLabel: "Someone",
      })
    ).toBe("You have a new notification");
  });
});
