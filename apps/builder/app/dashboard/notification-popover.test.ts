import { describe, test, expect } from "vitest";
import { __testing__, type NotificationItem } from "./notification-popover";

const { getDescription } = __testing__;

const createNotification = (
  overrides: Partial<NotificationItem> = {}
): NotificationItem =>
  ({
    id: "notif-1",
    type: "workspace_invite",
    status: "pending",
    payload: { workspaceId: "ws-1", relation: "viewers" },
    createdAt: "2026-03-16T00:00:00.000Z",
    senderEmail: "alice@example.com",
    senderName: "Alice",
    workspaceName: "Design team",
    ...overrides,
  }) as NotificationItem;

describe("getDescription", () => {
  test("workspace invite with all info", () => {
    const result = getDescription(createNotification());
    expect(result).toBe('Alice invited you to "Design team" as viewer');
  });

  test("workspace invite falls back to email when name is empty", () => {
    const result = getDescription(createNotification({ senderName: "" }));
    expect(result).toBe(
      'alice@example.com invited you to "Design team" as viewer'
    );
  });

  test("workspace invite falls back to 'Someone' when both are empty", () => {
    const result = getDescription(
      createNotification({ senderName: "", senderEmail: "" })
    );
    expect(result).toBe('Someone invited you to "Design team" as viewer');
  });

  test("workspace invite with admin relation", () => {
    const result = getDescription(
      createNotification({
        payload: { workspaceId: "ws-1", relation: "administrators" },
      })
    );
    expect(result).toBe('Alice invited you to "Design team" as admin');
  });

  test("workspace invite without workspace name", () => {
    const result = getDescription(
      createNotification({ workspaceName: undefined })
    );
    expect(result).toBe('Alice invited you to "a workspace" as viewer');
  });

  test("unknown notification type", () => {
    const result = getDescription(createNotification({ type: "unknown_type" }));
    expect(result).toBe("You have a new notification");
  });
});
