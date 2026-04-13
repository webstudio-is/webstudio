import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  json,
  empty,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { accept, __testing__ } from "./notification";

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

// ---------------------------------------------------------------------------
// accept() — domain guard (MSW integration)
// Verifies the correct table and filter are used in the ProjectDomain query.
// ---------------------------------------------------------------------------

const server = createTestServer();

const makeAcceptCtx = (
  planOverrides: Partial<typeof defaultPlanFeatures> = {}
): AppContext =>
  ({
    authorization: { type: "user", userId: "recipient-1" },
    planFeatures: defaultPlanFeatures,
    purchases: [],
    trpcCache: new Map(),
    domain: {},
    deployment: {},
    entri: {},
    ...testContext,
    createTokenContext: () => {},
    getOwnerPlanFeatures: async () => ({
      ...defaultPlanFeatures,
      ...planOverrides,
    }),
  }) as unknown as AppContext;

const notificationRow = {
  id: "notif-1",
  type: "projectTransfer",
  status: "pending",
  senderId: "sender-1",
  recipientId: "recipient-1",
  createdAt: new Date(Date.now() - 1000).toISOString(),
  respondedAt: null,
  payload: { projectId: "proj-1" },
};

/** Handlers shared by all accept() tests: notification load + claim */
const baseHandlers = [
  db.get("Notification", () => json(notificationRow)),
  db.patch("Notification", () => json({ id: "notif-1" })),
  // existence check — project exists, sender owns it
  db.get("Project", () => json({ id: "proj-1", userId: "sender-1" })),
  // receiver's project count — 0 projects owned
  db.head("Project", () => empty({ headers: { "Content-Range": "*/0" } })),
];

describe("accept — domain guard (msw)", () => {
  test("throws when free receiver tries to accept a project with a custom domain", async () => {
    server.use(
      ...baseHandlers,
      // ProjectDomain count — 1 domain attached
      db.head("ProjectDomain", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("projectId")).toBe("eq.proj-1");
        return empty({ headers: { "Content-Range": "*/1" } });
      })
    );

    const ctx = makeAcceptCtx({
      maxDomainsAllowedPerUser: 0,
      maxProjectsAllowedPerUser: 100,
    });

    await expect(accept({ notificationId: "notif-1" }, ctx)).rejects.toThrow(
      "custom domains attached"
    );
  });

  test("succeeds when free receiver accepts a project with no custom domains", async () => {
    server.use(
      ...baseHandlers,
      // ProjectDomain count — 0 domains
      db.head("ProjectDomain", () =>
        empty({ headers: { "Content-Range": "*/0" } })
      ),
      // default workspace lookup
      db.get("Workspace", () => json({ id: "ws-1" })),
      // project reassign
      db.patch("Project", () => json({ id: "proj-1" }))
    );

    const ctx = makeAcceptCtx({
      maxDomainsAllowedPerUser: 0,
      maxProjectsAllowedPerUser: 100,
    });

    await expect(
      accept({ notificationId: "notif-1" }, ctx)
    ).resolves.toBeUndefined();
  });
});
