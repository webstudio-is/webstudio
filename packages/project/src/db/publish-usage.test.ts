import { expect, test } from "vitest";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import {
  getWorkspaceDailyPublishLimit,
  getWorkspacePublishUsage,
} from "./publish-usage";

const server = createTestServer();

test.each([
  { base: 10, workspaces: 1, included: 0, extra: 3, expected: 10 },
  { base: 10, workspaces: 20, included: 0, extra: null, expected: 10 },
  { base: 100, workspaces: 1, included: 0, extra: null, expected: 100 },
  { base: 100, workspaces: 1, included: 2, extra: 3, expected: 600 },
  { base: 100, workspaces: 20, included: 2, extra: null, expected: 300 },
])(
  "publishing allowance $expected for $included included and $extra extra seats with base $base",
  ({ base, workspaces, included, extra, expected }) => {
    expect(
      getWorkspaceDailyPublishLimit(
        {
          ...defaultPlanFeatures,
          maxDailyPublishesPerUser: base,
          maxWorkspaces: workspaces,
          seatsIncluded: included,
        },
        extra
      )
    ).toBe(expected);
  }
);

test.each([
  { used: 250, remaining: 350 },
  { used: 600, remaining: 0 },
  { used: 700, remaining: 0 },
])(
  "reads durable workspace usage $used and the owner's unused paid seats",
  async ({ used, remaining }) => {
    server.use(
      db.get("Project", () => json({ userId: "owner" })),
      db.get("Product", () => json([{ id: "seats" }])),
      db.get("TransactionLog", ({ request }) => {
        expect(new URL(request.url).searchParams.get("userId")).toBe(
          "eq.owner"
        );
        return json({
          eventData: {
            data: { object: { items: { data: [{ quantity: 3 }] } } },
          },
        });
      }),
      db.post("rpc/get_workspace_publish_usage", async ({ request }) => {
        expect(await request.json()).toEqual({ project_id: "project" });
        return json(used);
      })
    );
    const context = {
      ...testContext,
      getOwnerPlanFeatures: async (ownerId: string) => {
        expect(ownerId).toBe("owner");
        return {
          ...defaultPlanFeatures,
          maxDailyPublishesPerUser: 100,
          seatsIncluded: 2,
        };
      },
    };
    await expect(getWorkspacePublishUsage("project", context)).resolves.toEqual(
      { count: used, limit: 600, remaining }
    );
  }
);

test("does not present unavailable usage as zero", async () => {
  server.use(
    db.get("Project", () => json({ userId: "owner" })),
    db.post("rpc/get_workspace_publish_usage", () =>
      json({ message: "Database unavailable" }, { status: 503 })
    )
  );
  const context = {
    ...testContext,
    getOwnerPlanFeatures: async () => defaultPlanFeatures,
  };
  await expect(
    getWorkspacePublishUsage("project", context)
  ).rejects.toMatchObject({ message: "Database unavailable" });
});
