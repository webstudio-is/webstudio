import { describe, test, expect } from "vitest";
import { __testing__ } from "./workspace-selector";
import type { WorkspaceWithRelation } from "@webstudio-is/project";

const { sortWorkspaces, canCreateWorkspace } = __testing__;

const createWorkspace = (
  overrides: Partial<WorkspaceWithRelation>
): WorkspaceWithRelation => ({
  id: "ws-1",
  name: "Workspace",
  isDefault: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  userId: "user-1",
  workspaceRelation: "own",
  ...overrides,
});

describe("sortWorkspaces", () => {
  test("places default workspace first", () => {
    const workspaces = [
      createWorkspace({ id: "ws-2", name: "Zeta", isDefault: false }),
      createWorkspace({ id: "ws-1", name: "Alpha", isDefault: true }),
      createWorkspace({ id: "ws-3", name: "Beta", isDefault: false }),
    ];

    const sorted = sortWorkspaces(workspaces);
    expect(sorted.map((w) => w.name)).toEqual(["Alpha", "Beta", "Zeta"]);
    expect(sorted[0].isDefault).toBe(true);
  });

  test("sorts non-default workspaces alphabetically", () => {
    const workspaces = [
      createWorkspace({ id: "ws-3", name: "Zebra" }),
      createWorkspace({ id: "ws-1", name: "Apple" }),
      createWorkspace({ id: "ws-2", name: "Mango" }),
    ];

    const sorted = sortWorkspaces(workspaces);
    expect(sorted.map((w) => w.name)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  test("does not mutate the original array", () => {
    const workspaces = [
      createWorkspace({ id: "ws-2", name: "Beta" }),
      createWorkspace({ id: "ws-1", name: "Alpha" }),
    ];
    const original = [...workspaces];

    sortWorkspaces(workspaces);
    expect(workspaces.map((w) => w.name)).toEqual(original.map((w) => w.name));
  });

  test("handles empty array", () => {
    expect(sortWorkspaces([])).toEqual([]);
  });

  test("handles single workspace", () => {
    const workspaces = [createWorkspace({ name: "Only one" })];
    const sorted = sortWorkspaces(workspaces);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe("Only one");
  });

  test("handles multiple default workspaces from different users", () => {
    // Edge case: list might contain defaults from different users
    const workspaces = [
      createWorkspace({
        id: "ws-3",
        name: "Charlie",
        isDefault: false,
      }),
      createWorkspace({
        id: "ws-1",
        name: "Alice default",
        isDefault: true,
        userId: "user-1",
      }),
      createWorkspace({
        id: "ws-2",
        name: "Bob default",
        isDefault: true,
        userId: "user-2",
      }),
    ];

    const sorted = sortWorkspaces(workspaces);
    // Both defaults come first (stable sort), then non-defaults
    expect(sorted[2].name).toBe("Charlie");
    expect(sorted[0].isDefault).toBe(true);
    expect(sorted[1].isDefault).toBe(true);
  });
});

describe("canCreateWorkspace", () => {
  test("allows creation when owned count is below limit", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", userId: "user-1", isDefault: true }),
    ];
    expect(canCreateWorkspace(workspaces, "user-1", 3)).toBe(true);
  });

  test("disallows creation when owned count equals limit", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", userId: "user-1", isDefault: true }),
    ];
    expect(canCreateWorkspace(workspaces, "user-1", 1)).toBe(false);
  });

  test("disallows creation when owned count exceeds limit", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", userId: "user-1", isDefault: true }),
      createWorkspace({ id: "ws-2", userId: "user-1" }),
    ];
    expect(canCreateWorkspace(workspaces, "user-1", 1)).toBe(false);
  });

  test("counts only workspaces owned by the user", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", userId: "user-1", isDefault: true }),
      createWorkspace({
        id: "ws-2",
        userId: "other-user",
        workspaceRelation: "editors",
      }),
      createWorkspace({
        id: "ws-3",
        userId: "other-user",
        workspaceRelation: "viewers",
      }),
    ];
    // User owns 1, limit is 2 → can create
    expect(canCreateWorkspace(workspaces, "user-1", 2)).toBe(true);
  });

  test("free plan with 1 default workspace cannot create", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", userId: "user-1", isDefault: true }),
    ];
    // Free plan: maxWorkspaces = 1, user already has 1 default
    expect(canCreateWorkspace(workspaces, "user-1", 1)).toBe(false);
  });
});
