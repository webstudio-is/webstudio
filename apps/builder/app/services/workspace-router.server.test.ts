import { describe, test, expect, vi } from "vitest";

// vi.hoisted runs before ESM imports, so env.server.ts sees these values.
vi.hoisted(() => {
  process.env.PAYMENT_WORKER_URL = "http://test-payment-worker";
  process.env.PAYMENT_WORKER_TOKEN = "test-token";
});

import { http, HttpResponse } from "msw";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { createCallerFactory } from "@webstudio-is/trpc-interface/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { defaultPlanFeatures, type PlanFeatures } from "@webstudio-is/plans";
import { workspaceRouter } from "./workspace-router.server";
import env from "~/env/env.server";

const server = createTestServer();

const createCaller = createCallerFactory(workspaceRouter);

const teamPlan: PlanFeatures = {
  ...defaultPlanFeatures,
  maxWorkspaces: 5,
  seatsIncluded: 4,
  maxSeatsPerWorkspace: 20,
};

const createContext = (
  overrides?: Partial<{ planFeatures: PlanFeatures; userId: string }>
): AppContext =>
  ({
    ...testContext,
    authorization: {
      type: "user",
      userId: overrides?.userId ?? "owner-1",
    },
    planFeatures: overrides?.planFeatures ?? teamPlan,
    purchases: [],
    trpcCache: { setMaxAge: () => {} },
    getOwnerPlanFeatures: async () => overrides?.planFeatures ?? teamPlan,
  }) as unknown as AppContext;

// ---------------------------------------------------------------------------
// Helpers – the addMember flow touches MANY PostgREST tables. The router code
// makes its own queries (seat-limit HEAD counts, invitee lookup, existing-
// member check) and then calls workspaceApi.addMember which duplicates some
// of those queries behind assertOwner / assertUser.  We use a single handler
// per table that inspects the request URL to distinguish the different calls.
// ---------------------------------------------------------------------------

/**
 * Set up all MSW handlers needed for a full addMember happy-path.
 * Individual tests override specific handlers via `server.use(…)` *after*
 * calling this function.
 */
const setupAddMemberMocks = (opts?: {
  /** Active members in the target workspace (used for HEAD count) */
  workspaceMemberCount?: number;
  /** Pending invites for the target workspace (used for HEAD count) */
  pendingInviteCount?: number;
  /**
   * Unique members across ALL owner's workspaces (used by countAllMembers
   * inside syncOwnerSeats).
   */
  totalUniqueMembers?: number;
  /** Pending invites sent by the owner across all workspaces */
  totalPendingInvites?: number;
  /** Payment worker JSON response, or `null` to return HTTP 500. */
  paymentWorkerResponse?: object | null;
}) => {
  const {
    workspaceMemberCount = 1,
    pendingInviteCount = 0,
    totalUniqueMembers = 1,
    totalPendingInvites = 0,
    paymentWorkerResponse = {
      type: "success" as const,
      seats: totalUniqueMembers + 1,
    },
  } = opts ?? {};

  server.use(
    // ---- Workspace (multiple calls: router seat-limit, syncOwnerSeats,
    // assertOwner inside workspaceApi.addMember) ----
    db.get("Workspace", ({ request }) => {
      const url = new URL(request.url);
      // countAllMembers asks for all workspaces owned by userId
      if (url.searchParams.get("userId")) {
        return json([{ id: "ws-1" }]);
      }
      // assertOwner / syncOwnerSeats asks for a single workspace by id
      return json({ id: "ws-1", userId: "owner-1", isDeleted: false });
    }),

    // ---- User (router invitee-lookup + workspaceApi.addMember lookup +
    // any other User fetches) ----
    db.get("User", () =>
      json({ id: "user-2", email: "invitee@test.com", username: "invitee" })
    ),

    // ---- WorkspaceMember ----
    // GET is used for:
    //  1. router existing-member check (eq userId=user-2 on a single ws)
    //  2. workspaceApi.addMember existing-member check (same)
    //  3. countAllMembers (select userId, in workspaceId)
    db.get("WorkspaceMember", ({ request }) => {
      const url = new URL(request.url);
      // Existing-member check – return null (not a member yet)
      if (url.searchParams.get("userId")?.includes("user-2")) {
        return json(null);
      }
      // countAllMembers – return unique members
      return json(
        Array.from({ length: totalUniqueMembers }, (_, i) => ({
          userId: `member-${i}`,
        }))
      );
    }),
    // HEAD is used for the per-workspace seat-limit count
    db.head("WorkspaceMember", () =>
      empty({ headers: { "Content-Range": `*/${workspaceMemberCount}` } })
    ),

    // ---- Notification ----
    // HEAD: router pending-invite count for seat limit
    db.head("Notification", () =>
      empty({ headers: { "Content-Range": `*/${pendingInviteCount}` } })
    ),
    // GET: countAllMembers pending count + createNotification duplicate check
    db.get("Notification", ({ request }) => {
      const url = new URL(request.url);
      // countAllMembers uses count: "exact" + head: true  but that's routed
      // through HEAD above. The GET here is the duplicate-check in
      // createNotification.
      if (url.searchParams.get("select") === "id") {
        // No duplicate
        return json(null);
      }
      return json([]);
    }),
    // POST: Notification insert (createNotification)
    db.post("Notification", () =>
      json(
        {
          id: "notif-1",
          type: "workspaceInvite",
          recipientId: "user-2",
          senderId: "owner-1",
          status: "pending",
          payload: { workspaceId: "ws-1", relation: "editors" },
        },
        { status: 201 }
      )
    ),

    // ---- Payment worker ----
    http.post(`${env.PAYMENT_WORKER_URL}/seats/update`, () => {
      if (paymentWorkerResponse === null) {
        return new HttpResponse(null, { status: 500 });
      }
      return HttpResponse.json(paymentWorkerResponse);
    })
  );
};

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------

describe("addMember", () => {
  test("rejects when maxWorkspaces <= 1 (free/pro plan)", async () => {
    // No DB mocks needed — the check happens before any queries.
    const ctx = createContext({ planFeatures: defaultPlanFeatures });
    const caller = createCaller(ctx);

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Upgrade your plan");
    }
  });

  test("rejects when workspace seat limit reached", async () => {
    const plan: PlanFeatures = { ...teamPlan, maxSeatsPerWorkspace: 2 };
    const ctx = createContext({ planFeatures: plan });
    const caller = createCaller(ctx);

    // 2 members + 0 pending = 2 >= maxSeatsPerWorkspace(2)
    setupAddMemberMocks({ workspaceMemberCount: 2, pendingInviteCount: 0 });

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("seat limit");
    }
  });

  test("rejects when members + pending invites >= maxSeatsPerWorkspace", async () => {
    const plan: PlanFeatures = { ...teamPlan, maxSeatsPerWorkspace: 2 };
    const ctx = createContext({ planFeatures: plan });
    const caller = createCaller(ctx);

    // 1 member + 1 pending = 2 >= maxSeatsPerWorkspace(2)
    setupAddMemberMocks({ workspaceMemberCount: 1, pendingInviteCount: 1 });

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("seat limit");
    }
  });

  test("rejects when payment worker returns error (card declined)", async () => {
    const ctx = createContext();
    const caller = createCaller(ctx);

    setupAddMemberMocks({
      paymentWorkerResponse: {
        type: "error",
        error: "Your card was declined.",
      },
    });

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unable to update billing");
    }
  });

  test("rejects when payment worker HTTP response is not ok", async () => {
    const ctx = createContext();
    const caller = createCaller(ctx);

    setupAddMemberMocks({ paymentWorkerResponse: null });

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unable to update billing");
    }
  });

  test("pre-charges payment worker with countAllMembers + 1", async () => {
    const ctx = createContext();
    const caller = createCaller(ctx);

    let capturedBody: { userId: string; newQuantity: number } | undefined;

    setupAddMemberMocks({ totalUniqueMembers: 3, totalPendingInvites: 0 });

    // Override the payment worker handler to capture the request body.
    server.use(
      http.post(
        `${env.PAYMENT_WORKER_URL}/seats/update`,
        async ({ request }) => {
          capturedBody = (await request.json()) as typeof capturedBody;
          return HttpResponse.json({ type: "success", seats: 4 });
        }
      )
    );

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(true);
    expect(capturedBody).toBeDefined();
    // 3 unique members + 1 delta = 4
    expect(capturedBody!.newQuantity).toBe(4);
    expect(capturedBody!.userId).toBe("owner-1");
  });

  test("succeeds and creates invite notification when billing passes", async () => {
    const ctx = createContext();
    const caller = createCaller(ctx);

    setupAddMemberMocks({ workspaceMemberCount: 2, totalUniqueMembers: 2 });

    const result = await caller.addMember({
      workspaceId: "ws-1",
      email: "invitee@test.com",
      relation: "editors",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.notificationId).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe("removeMember", () => {
  test("does NOT call payment worker (high water mark billing)", async () => {
    let paymentWorkerCalled = false;

    server.use(
      // assertOwner
      db.get("Workspace", () =>
        json({ id: "ws-1", userId: "owner-1", isDeleted: false })
      ),
      // soft-delete via PATCH
      db.patch("WorkspaceMember", () => json({ userId: "user-2" })),
      // Trap: if the payment worker is called, fail the test.
      http.post(`${env.PAYMENT_WORKER_URL}/seats/update`, () => {
        paymentWorkerCalled = true;
        return HttpResponse.json({ type: "success", seats: 1 });
      })
    );

    const ctx = createContext();
    const caller = createCaller(ctx);
    const result = await caller.removeMember({
      workspaceId: "ws-1",
      memberUserId: "user-2",
    });

    expect(result.success).toBe(true);
    expect(paymentWorkerCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// syncSeats
// ---------------------------------------------------------------------------

describe("syncSeats", () => {
  test("rejects when maxWorkspaces <= 1", async () => {
    const ctx = createContext({ planFeatures: defaultPlanFeatures });
    const caller = createCaller(ctx);

    const result = await caller.syncSeats({ workspaceId: "ws-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Upgrade your plan");
    }
  });

  test("calls payment worker with actual member count (no delta)", async () => {
    let capturedBody: { userId: string; newQuantity: number } | undefined;

    server.use(
      // syncOwnerSeats fetches workspace to get ownerId
      db.get("Workspace", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("userId")) {
          return json([{ id: "ws-1" }]);
        }
        return json({ id: "ws-1", userId: "owner-1", isDeleted: false });
      }),
      // countAllMembers — 2 unique members
      db.get("WorkspaceMember", () =>
        json([{ userId: "m-1" }, { userId: "m-2" }])
      ),
      // countAllMembers — 1 pending invite
      db.head("Notification", () =>
        empty({ headers: { "Content-Range": "*/1" } })
      ),
      http.post(
        `${env.PAYMENT_WORKER_URL}/seats/update`,
        async ({ request }) => {
          capturedBody = (await request.json()) as typeof capturedBody;
          return HttpResponse.json({ type: "success", seats: 3 });
        }
      )
    );

    const ctx = createContext();
    const caller = createCaller(ctx);
    const result = await caller.syncSeats({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    expect(capturedBody).toBeDefined();
    // 2 unique members + 1 pending invite = 3, no +1 delta
    expect(capturedBody!.newQuantity).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// listMembers
// ---------------------------------------------------------------------------

describe("listMembers", () => {
  const setupListMembersMocks = (opts: {
    memberCount?: number;
    transactionLog?: object | null;
  }) => {
    const { memberCount = 2, transactionLog = null } = opts;

    const members = Array.from({ length: memberCount }, (_, i) => ({
      userId: `m-${i + 1}`,
      relation: "editors",
      createdAt: "2024-01-01T00:00:00.000Z",
    }));

    server.use(
      // listMembers: Workspace lookup + owner-or-member check
      db.get("Workspace", () =>
        json({ id: "ws-1", userId: "owner-1", isDeleted: false })
      ),
      // listMembers: WorkspaceMember SELECT (members list + access check)
      db.get("WorkspaceMember", () => json(members)),
      // listMembers: Notification GET (pending invites for this workspace)
      db.get("Notification", () => json([])),
      // listMembers: User batch lookup
      db.get("User", () =>
        json([
          { id: "owner-1", email: "owner@test.com", username: "owner" },
          ...members.map((m) => ({
            id: m.userId,
            email: `${m.userId}@test.com`,
            username: m.userId,
          })),
        ])
      ),
      // getPaidSeats: TransactionLog query
      db.get("TransactionLog", () => json(transactionLog))
    );
  };

  test("maxSeats = seatsIncluded + extraSeats when subscription exists", async () => {
    // seatsIncluded=4, quantity=2 → maxSeats=6
    setupListMembersMocks({
      transactionLog: {
        eventData: {
          data: { object: { items: { data: [{ quantity: 2 }] } } },
        },
      },
    });

    const ctx = createContext();
    const caller = createCaller(ctx);
    const result = await caller.listMembers({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxSeats).toBe(6); // 4 + 2
    }
  });

  test("maxSeats = seatsIncluded when no subscription events", async () => {
    // seatsIncluded=4, no TransactionLog event → paidSeats=null → maxSeats=4
    setupListMembersMocks({ transactionLog: null });

    const ctx = createContext();
    const caller = createCaller(ctx);
    const result = await caller.listMembers({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxSeats).toBe(4); // 4 + 0
    }
  });

  test("maxSeats = seatsIncluded when subscription has quantity=0", async () => {
    setupListMembersMocks({
      transactionLog: {
        eventData: {
          data: { object: { items: { data: [{ quantity: 0 }] } } },
        },
      },
    });

    const ctx = createContext();
    const caller = createCaller(ctx);
    const result = await caller.listMembers({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxSeats).toBe(4); // 4 + 0
    }
  });

  test("returns owner, members, and pendingInvites", async () => {
    setupListMembersMocks({ memberCount: 2, transactionLog: null });

    const ctx = createContext();
    const caller = createCaller(ctx);
    const result = await caller.listMembers({ workspaceId: "ws-1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owner.userId).toBe("owner-1");
      expect(result.data.members).toHaveLength(2);
      expect(result.data.pendingInvites).toHaveLength(0);
    }
  });
});
