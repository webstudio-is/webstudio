import { describe, test, expect } from "vitest";
import { __testing__ } from "./selector";
import type { WorkspaceWithRelation } from "@webstudio-is/project";

const { sortWorkspaces, groupWorkspaces } = __testing__;

const createWorkspace = (
  overrides: Partial<WorkspaceWithRelation>
): WorkspaceWithRelation => ({
  id: "ws-1",
  name: "Workspace",
  isDefault: false,
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  userId: "user-1",
  role: "own",
  isDowngraded: false,
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

describe("groupWorkspaces", () => {
  test("separates owned and shared workspaces", () => {
    const workspaces = [
      createWorkspace({
        id: "ws-1",
        name: "My workspace",
        isDefault: true,
        role: "own",
      }),
      createWorkspace({
        id: "ws-2",
        name: "Team workspace",
        userId: "other-user",
        role: "editors",
      }),
      createWorkspace({
        id: "ws-3",
        name: "Client workspace",
        role: "own",
      }),
    ];

    const { owned, shared } = groupWorkspaces(workspaces);
    expect(owned.map((w) => w.name)).toEqual([
      "My workspace",
      "Client workspace",
    ]);
    expect(shared.map((w) => w.name)).toEqual(["Team workspace"]);
  });

  test("returns empty shared when all workspaces are owned", () => {
    const workspaces = [
      createWorkspace({ id: "ws-1", name: "Alpha", role: "own" }),
      createWorkspace({ id: "ws-2", name: "Beta", role: "own" }),
    ];

    const { owned, shared } = groupWorkspaces(workspaces);
    expect(owned).toHaveLength(2);
    expect(shared).toHaveLength(0);
  });

  test("returns empty owned when all workspaces are shared", () => {
    const workspaces = [
      createWorkspace({
        id: "ws-1",
        name: "Shared A",
        userId: "other",
        role: "viewers",
      }),
    ];

    const { owned, shared } = groupWorkspaces(workspaces);
    expect(owned).toHaveLength(0);
    expect(shared).toHaveLength(1);
  });

  test("sorts within each group", () => {
    const workspaces = [
      createWorkspace({
        id: "ws-3",
        name: "Zebra",
        role: "own",
      }),
      createWorkspace({
        id: "ws-2",
        name: "Apple",
        role: "own",
      }),
      createWorkspace({
        id: "ws-4",
        name: "Mango shared",
        userId: "other",
        role: "editors",
      }),
      createWorkspace({
        id: "ws-5",
        name: "Alpha shared",
        userId: "other",
        role: "viewers",
      }),
    ];

    const { owned, shared } = groupWorkspaces(workspaces);
    expect(owned.map((w) => w.name)).toEqual(["Apple", "Zebra"]);
    expect(shared.map((w) => w.name)).toEqual(["Alpha shared", "Mango shared"]);
  });

  test("handles empty array", () => {
    const { owned, shared } = groupWorkspaces([]);
    expect(owned).toEqual([]);
    expect(shared).toEqual([]);
  });
});
