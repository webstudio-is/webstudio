import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import {
  create,
  rename,
  remove,
  findMany,
  countAllMembers,
  addMember,
  updateRole,
  removeMember,
  moveProject,
  transferProject,
  findSharedWorkspacesByOwnerEmail,
} from "./workspace";

const server = createTestServer();

const createContext = (userId = "user-1"): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId },
    getOwnerPlanFeatures: async () => defaultPlanFeatures,
  }) as unknown as AppContext;

const workspaceRow = {
  id: "ws-1",
  name: "My Workspace",
  userId: "user-1",
  isDefault: false,
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("create (msw)", () => {
  test("throws for non-user auth (anonymous)", async () => {
    const ctx = {
      ...testContext,
      authorization: { type: "anonymous" },
    } as unknown as AppContext;
    await expect(
      create({ name: "Test", maxWorkspaces: 5 }, ctx)
    ).rejects.toThrow(AuthorizationError);
  });

  test("throws when workspace name is too short", async () => {
    await expect(
      create({ name: "x", maxWorkspaces: 5 }, createContext())
    ).rejects.toThrow("at least 2 characters");
  });

  test("throws when user is at the workspace limit", async () => {
    server.use(
      db.head("Workspace", () => empty({ headers: { "Content-Range": "*/5" } }))
    );

    await expect(
      create({ name: "New WS", maxWorkspaces: 5 }, createContext())
    ).rejects.toThrow("maximum number of workspaces");
  });

  test("creates workspace when under limit", async () => {
    server.use(
      db.head("Workspace", () =>
        empty({ headers: { "Content-Range": "*/2" } })
      ),
      db.post("Workspace", () => json(workspaceRow, { status: 201 }))
    );

    const result = await create(
      { name: "New WS", maxWorkspaces: 5 },
      createContext()
    );
    expect(result.name).toBe("My Workspace");
  });
});

// ---------------------------------------------------------------------------
// rename
// ---------------------------------------------------------------------------

describe("rename (msw)", () => {
  test("throws for name too short", async () => {
    await expect(
      rename({ workspaceId: "ws-1", name: "x" }, createContext())
    ).rejects.toThrow("at least 2 characters");
  });

  test("renames workspace and returns updated row", async () => {
    server.use(
      db.patch("Workspace", () => json({ ...workspaceRow, name: "Renamed" }))
    );

    const result = await rename(
      { workspaceId: "ws-1", name: "Renamed" },
      createContext()
    );
    expect(result.name).toBe("Renamed");
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe("remove (msw)", () => {
  test("throws when workspace has projects and deleteProjects is not set", async () => {
    server.use(
      db.get("Workspace", () => json(workspaceRow)),
      db.get("Project", () => json([{ id: "proj-1" }]))
    );

    await expect(
      remove({ workspaceId: "ws-1" }, createContext())
    ).rejects.toThrow("still contains projects");
  });

  test("throws when caller is not the owner", async () => {
    server.use(
      db.get("Workspace", () => json({ ...workspaceRow, userId: "other-user" }))
    );

    await expect(
      remove({ workspaceId: "ws-1" }, createContext("user-1"))
    ).rejects.toThrow(AuthorizationError);
  });

  test("throws when trying to delete the default workspace", async () => {
    server.use(
      db.get("Workspace", () => json({ ...workspaceRow, isDefault: true }))
    );

    await expect(
      remove({ workspaceId: "ws-1" }, createContext())
    ).rejects.toThrow("default workspace cannot be deleted");
  });

  test("soft-deletes workspace when empty", async () => {
    let patched = false;
    server.use(
      db.get("Workspace", () => json(workspaceRow)),
      db.get("Project", () => json([])),
      db.patch("Workspace", () => {
        patched = true;
        return empty({ status: 204 });
      })
    );

    await remove({ workspaceId: "ws-1" }, createContext());
    expect(patched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findMany
// ---------------------------------------------------------------------------

describe("findMany (msw)", () => {
  test("returns owned workspaces with role=own", async () => {
    server.use(
      db.get("Workspace", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("userId")) {
          return json([workspaceRow]);
        }
        return json([]);
      }),
      db.get("WorkspaceMember", () => json([]))
    );

    const result = await findMany("user-1", createContext());
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("own");
    expect(result[0].isDowngraded).toBe(false);
  });

  test("returns member workspaces with isDowngraded=true when owner plan maxWorkspaces<=1", async () => {
    server.use(
      // owned: none
      db.get("Workspace", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.has("userId")) {
          // first call: owned workspaces (eq userId)
          if (url.searchParams.get("userId") === "eq.user-1") {
            return json([]);
          }
          // third call: member workspace details
          return json([{ ...workspaceRow, id: "ws-2", userId: "owner-2" }]);
        }
        // in workspaceIds
        return json([{ ...workspaceRow, id: "ws-2", userId: "owner-2" }]);
      }),
      db.get("WorkspaceMember", () =>
        json([{ workspaceId: "ws-2", relation: "editors" }])
      )
    );

    const ctx = createContext();
    ctx.getOwnerPlanFeatures = async () => ({
      ...defaultPlanFeatures,
      maxWorkspaces: 1,
    });

    const result = await findMany("user-1", ctx);
    const member = result.find((w) => w.id === "ws-2");
    expect(member?.isDowngraded).toBe(true);
  });

  test("returns member workspaces with isDowngraded=true when actualMembers > paidSeats", async () => {
    // Owner has workspaces plan (maxWorkspaces > 1), 3 members + 1 pending = 4 non-owner total,
    // seatsIncluded=2 and extra-seat sub quantity=1 → paidSeats=3 < memberCount=4.
    server.use(
      db.get("Workspace", ({ request }) => {
        const url = new URL(request.url);
        // owned workspaces lookup for the viewer (user-1)
        if (url.searchParams.get("userId") === "eq.user-1") {
          return json([]);
        }
        // owner's workspaces lookup used by countAllMembers
        if (url.searchParams.get("userId") === "eq.owner-2") {
          return json([{ id: "ws-2" }, { id: "ws-3" }]);
        }
        // member workspace details lookup (by id in list)
        return json([{ ...workspaceRow, id: "ws-2", userId: "owner-2" }]);
      }),
      db.get("WorkspaceMember", ({ request }) => {
        const url = new URL(request.url);
        // memberships lookup: userId=eq.user-1
        if (url.searchParams.get("userId") === "eq.user-1") {
          return json([{ workspaceId: "ws-2", relation: "editors" }]);
        }
        // countAllMembers lookup: workspaceId=in.(...)
        return json([
          { userId: "member-1" },
          { userId: "member-2" },
          { userId: "member-3" },
        ]);
      }),
      db.head("Notification", () =>
        empty({ headers: { "Content-Range": "*/1" } })
      ),
      db.get("TransactionLog", () =>
        json({
          eventData: {
            data: { object: { items: { data: [{ quantity: 1 }] } } },
          },
        })
      )
    );

    const ctx = createContext();
    ctx.getOwnerPlanFeatures = async () => ({
      ...defaultPlanFeatures,
      maxWorkspaces: 5,
      seatsIncluded: 2,
    });

    const result = await findMany("user-1", ctx);
    const member = result.find((w) => w.id === "ws-2");
    expect(member?.isDowngraded).toBe(true);
  });

  test("returns member workspaces with isDowngraded=false when actualMembers <= paidSeats", async () => {
    // owner has workspaces plan, 1 non-owner member, seatsIncluded=2 → memberCount(1) < paidSeats(2).
    server.use(
      db.get("Workspace", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("userId") === "eq.user-1") {
          return json([]);
        }
        if (url.searchParams.get("userId") === "eq.owner-2") {
          return json([{ id: "ws-2" }]);
        }
        return json([{ ...workspaceRow, id: "ws-2", userId: "owner-2" }]);
      }),
      db.get("WorkspaceMember", ({ request }) => {
        const url = new URL(request.url);
        // memberships lookup: userId=eq.user-1
        if (url.searchParams.get("userId") === "eq.user-1") {
          return json([{ workspaceId: "ws-2", relation: "editors" }]);
        }
        // countAllMembers lookup: workspaceId=in.(...)
        return json([{ userId: "member-1" }]);
      }),
      db.head("Notification", () =>
        empty({ headers: { "Content-Range": "*/0" } })
      ),
      db.get("TransactionLog", () => json(null))
    );

    const ctx = createContext();
    ctx.getOwnerPlanFeatures = async () => ({
      ...defaultPlanFeatures,
      maxWorkspaces: 5,
      seatsIncluded: 2,
    });

    const result = await findMany("user-1", ctx);
    const member = result.find((w) => w.id === "ws-2");
    expect(member?.isDowngraded).toBe(false);
  });

  test("returns isDowngraded=false when memberCount === seatsIncluded (boundary)", async () => {
    // Exactly seatsIncluded non-owner members: slots are full but not exceeded.
    // No extra-seat sub needed and no suspension should fire.
    server.use(
      db.get("Workspace", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("userId") === "eq.user-1") {
          return json([]);
        }
        if (url.searchParams.get("userId") === "eq.owner-2") {
          return json([{ id: "ws-2" }]);
        }
        return json([{ ...workspaceRow, id: "ws-2", userId: "owner-2" }]);
      }),
      db.get("WorkspaceMember", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("userId") === "eq.user-1") {
          return json([{ workspaceId: "ws-2", relation: "editors" }]);
        }
        // 2 members exactly filling seatsIncluded=2 (no extra sub).
        return json([{ userId: "member-1" }, { userId: "member-2" }]);
      }),
      db.head("Notification", () =>
        empty({ headers: { "Content-Range": "*/0" } })
      ),
      db.get("TransactionLog", () => json(null))
    );

    const ctx = createContext();
    ctx.getOwnerPlanFeatures = async () => ({
      ...defaultPlanFeatures,
      maxWorkspaces: 5,
      seatsIncluded: 2,
    });

    const result = await findMany("user-1", ctx);
    const member = result.find((w) => w.id === "ws-2");
    // memberCount(2) === paidSeats(2) → not downgraded.
    expect(member?.isDowngraded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// countAllMembers
// ---------------------------------------------------------------------------

describe("countAllMembers (msw)", () => {
  test("returns 0 when user has no workspaces", async () => {
    server.use(db.get("Workspace", () => json([])));

    const count = await countAllMembers("user-1", createContext());
    expect(count).toBe(0);
  });

  test("returns sum of active members + pending invites", async () => {
    server.use(
      db.get("Workspace", () => json([workspaceRow])),
      db.get("WorkspaceMember", () =>
        json([{ userId: "m1" }, { userId: "m2" }, { userId: "m3" }])
      ),
      db.head("Notification", () =>
        empty({ headers: { "Content-Range": "*/2" } })
      )
    );

    const count = await countAllMembers("user-1", createContext());
    expect(count).toBe(5);
  });

  test("deduplicates same member across multiple workspaces", async () => {
    // "user-a" appears in two workspaces — should count as 1, not 2.
    server.use(
      db.get("Workspace", () => json([{ id: "ws-1" }, { id: "ws-2" }])),
      db.get("WorkspaceMember", () =>
        json([{ userId: "user-a" }, { userId: "user-a" }])
      ),
      db.head("Notification", () =>
        empty({ headers: { "Content-Range": "*/0" } })
      )
    );

    const count = await countAllMembers("user-1", createContext());
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------

describe("addMember (msw)", () => {
  const ownerWorkspace = { id: "ws-1", userId: "user-1" };

  test("throws when invited email does not exist", async () => {
    server.use(
      db.get("Workspace", () => json(ownerWorkspace)),
      db.get("User", () => json(null))
    );

    await expect(
      addMember(
        { workspaceId: "ws-1", email: "unknown@test.com", relation: "editors" },
        createContext()
      )
    ).rejects.toThrow("No Webstudio account found");
  });

  test("throws when inviting yourself", async () => {
    server.use(
      db.get("Workspace", () => json(ownerWorkspace)),
      db.get("User", () =>
        json({ id: "user-1", email: "me@test.com", username: "me" })
      )
    );

    await expect(
      addMember(
        { workspaceId: "ws-1", email: "me@test.com", relation: "editors" },
        createContext()
      )
    ).rejects.toThrow("already the owner");
  });

  test("throws when invitee is already a member", async () => {
    server.use(
      db.get("Workspace", () => json(ownerWorkspace)),
      db.get("User", () =>
        json({ id: "user-2", email: "other@test.com", username: "other" })
      ),
      db.get("WorkspaceMember", () => json({ userId: "user-2" }))
    );

    await expect(
      addMember(
        { workspaceId: "ws-1", email: "other@test.com", relation: "editors" },
        createContext()
      )
    ).rejects.toThrow("Already a member");
  });
});

// ---------------------------------------------------------------------------
// updateRole
// ---------------------------------------------------------------------------

describe("updateRole (msw)", () => {
  const ownerWorkspace = { id: "ws-1", userId: "user-1" };

  test("throws when trying to change own role", async () => {
    server.use(db.get("Workspace", () => json(ownerWorkspace)));
    await expect(
      updateRole(
        { workspaceId: "ws-1", memberUserId: "user-1", relation: "editors" },
        createContext()
      )
    ).rejects.toThrow("Cannot change the workspace owner's role");
  });

  test("throws when member not found", async () => {
    server.use(
      db.get("Workspace", () => json(ownerWorkspace)),
      db.patch("WorkspaceMember", () => json(null))
    );

    await expect(
      updateRole(
        { workspaceId: "ws-1", memberUserId: "user-2", relation: "editors" },
        createContext()
      )
    ).rejects.toThrow("Member not found");
  });

  test("updates member role successfully", async () => {
    server.use(
      db.get("Workspace", () => json(ownerWorkspace)),
      db.patch("WorkspaceMember", () =>
        json({ userId: "user-2", relation: "editors" })
      )
    );

    await updateRole(
      { workspaceId: "ws-1", memberUserId: "user-2", relation: "editors" },
      createContext()
    );
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe("removeMember (msw)", () => {
  test("throws when owner tries to remove themselves", async () => {
    server.use(
      db.get("Workspace", () => json({ id: "ws-1", userId: "user-1" }))
    );

    await expect(
      removeMember(
        { workspaceId: "ws-1", memberUserId: "user-1" },
        createContext()
      )
    ).rejects.toThrow("owner cannot be removed");
  });

  test("throws when member not found", async () => {
    server.use(
      db.get("Workspace", () => json({ id: "ws-1", userId: "user-1" })),
      db.patch("WorkspaceMember", () => json(null))
    );

    await expect(
      removeMember(
        { workspaceId: "ws-1", memberUserId: "user-2" },
        createContext()
      )
    ).rejects.toThrow("Member not found");
  });

  test("removes member successfully", async () => {
    server.use(
      db.get("Workspace", () => json({ id: "ws-1", userId: "user-1" })),
      db.patch("WorkspaceMember", () => json({ userId: "user-2" }))
    );

    await removeMember(
      { workspaceId: "ws-1", memberUserId: "user-2" },
      createContext()
    );
  });
});

// ---------------------------------------------------------------------------
// moveProject
// ---------------------------------------------------------------------------

describe("moveProject (msw)", () => {
  test("throws when project not found", async () => {
    server.use(
      db.get("Project", () => {
        throw new Error("error");
      })
    );

    await expect(
      moveProject(
        { projectId: "proj-1", targetWorkspaceId: "ws-2" },
        createContext()
      )
    ).rejects.toThrow();
  });

  test("throws when cross-owner move attempted", async () => {
    server.use(
      db.get("Project", ({ request }) => {
        const url = new URL(request.url);
        // assertProjectPermission selects by id+isDeleted
        if (url.searchParams.get("isDeleted")) {
          return json({ id: "proj-1", userId: "user-1", workspaceId: null });
        }
        return json(null);
      }),
      db.get("Workspace", () => json({ id: "ws-2", userId: "user-2" }))
    );

    await expect(
      moveProject(
        { projectId: "proj-1", targetWorkspaceId: "ws-2" },
        createContext()
      )
    ).rejects.toThrow(AuthorizationError);
  });
});

// ---------------------------------------------------------------------------
// transferProject
// ---------------------------------------------------------------------------

describe("transferProject (msw)", () => {
  test("silently succeeds when recipient email not found", async () => {
    server.use(
      db.get("Project", () =>
        json({ id: "proj-1", userId: "user-1", workspaceId: null })
      ),
      db.get("User", () => json(null))
    );

    await transferProject(
      { projectId: "proj-1", recipientEmail: "ghost@test.com" },
      createContext()
    );
  });

  test("throws when transferring to yourself", async () => {
    server.use(
      db.get("Project", () =>
        json({ id: "proj-1", userId: "user-1", workspaceId: null })
      ),
      db.get("User", () => json({ id: "user-1" }))
    );

    await expect(
      transferProject(
        { projectId: "proj-1", recipientEmail: "me@test.com" },
        createContext()
      )
    ).rejects.toThrow("cannot transfer a project to yourself");
  });
});

// ---------------------------------------------------------------------------
// findSharedWorkspacesByOwnerEmail
// ---------------------------------------------------------------------------

describe("findSharedWorkspacesByOwnerEmail (msw)", () => {
  test("returns empty array when target user not found", async () => {
    server.use(db.get("User", () => json(null)));

    const result = await findSharedWorkspacesByOwnerEmail(
      { email: "ghost@test.com" },
      createContext()
    );
    expect(result).toEqual([]);
  });

  test("returns workspaces where caller is a member", async () => {
    server.use(
      db.get("User", () => json({ id: "user-2" })),
      db.get("Workspace", () => json([{ id: "ws-shared", name: "Shared WS" }])),
      db.get("WorkspaceMember", () => json([{ workspaceId: "ws-shared" }]))
    );

    const result = await findSharedWorkspacesByOwnerEmail(
      { email: "other@test.com" },
      createContext()
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ws-shared");
  });

  test("returns empty when caller is not a member of any target workspace", async () => {
    server.use(
      db.get("User", () => json({ id: "user-2" })),
      db.get("Workspace", () => json([{ id: "ws-other", name: "Other WS" }])),
      db.get("WorkspaceMember", () => json([]))
    );

    const result = await findSharedWorkspacesByOwnerEmail(
      { email: "other@test.com" },
      createContext()
    );
    expect(result).toEqual([]);
  });
});
