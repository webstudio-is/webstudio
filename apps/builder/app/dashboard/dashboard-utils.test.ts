import { describe, test, expect } from "vitest";
import { resolveCurrentWorkspace } from "./dashboard-utils";
import type { WorkspaceWithRelation } from "@webstudio-is/project";

const createWorkspace = (
  overrides: Partial<WorkspaceWithRelation> = {}
): WorkspaceWithRelation => ({
  id: "ws-1",
  name: "Workspace",
  isDefault: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  userId: "user-1",
  workspaceRelation: "own",
  isDowngraded: false,
  ...overrides,
});

describe("resolveCurrentWorkspace", () => {
  test("returns default workspace when no selectedId", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", isDefault: false }),
      createWorkspace({ id: "ws-2", isDefault: true, name: "Default" }),
    ];

    const result = resolveCurrentWorkspace(workspaces, undefined);
    expect(result).toEqual({
      type: "resolved",
      workspace: expect.objectContaining({ id: "ws-2", isDefault: true }),
    });
  });

  test("returns matched workspace when selectedId exists", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", isDefault: true }),
      createWorkspace({ id: "ws-2", isDefault: false, name: "Selected" }),
    ];

    const result = resolveCurrentWorkspace(workspaces, "ws-2");
    expect(result).toEqual({
      type: "resolved",
      workspace: expect.objectContaining({ id: "ws-2", name: "Selected" }),
    });
  });

  test("returns stale when selectedId does not match any workspace", () => {
    const workspaces = [createWorkspace({ id: "ws-1", isDefault: true })];

    const result = resolveCurrentWorkspace(workspaces, "ws-gone");
    expect(result).toEqual({ type: "stale" });
  });

  test("returns undefined workspace when no default and no selectedId", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", isDefault: false }),
      createWorkspace({ id: "ws-2", isDefault: false }),
    ];

    const result = resolveCurrentWorkspace(workspaces, undefined);
    expect(result).toEqual({ type: "resolved", workspace: undefined });
  });

  test("returns undefined workspace for empty list with no selectedId", () => {
    const result = resolveCurrentWorkspace([], undefined);
    expect(result).toEqual({ type: "resolved", workspace: undefined });
  });

  test("returns stale for empty list with selectedId", () => {
    const result = resolveCurrentWorkspace([], "ws-1");
    expect(result).toEqual({ type: "stale" });
  });

  test("selected workspace takes precedence over default", () => {
    const workspaces = [
      createWorkspace({ id: "ws-default", isDefault: true }),
      createWorkspace({ id: "ws-selected", isDefault: false }),
    ];

    const result = resolveCurrentWorkspace(workspaces, "ws-selected");
    expect(result).toEqual({
      type: "resolved",
      workspace: expect.objectContaining({ id: "ws-selected" }),
    });
  });

  test("preserves workspace relation in result", () => {
    const workspaces = [
      createWorkspace({
        id: "ws-1",
        isDefault: true,
        workspaceRelation: "editors",
      }),
    ];

    const result = resolveCurrentWorkspace(workspaces, undefined);
    expect(result.type).toBe("resolved");
    if (result.type === "resolved") {
      expect(result.workspace?.workspaceRelation).toBe("editors");
    }
  });
});
