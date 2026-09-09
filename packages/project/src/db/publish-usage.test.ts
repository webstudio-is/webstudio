import { expect, test } from "vitest";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import {
  createTestServer,
  db,
  empty,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { getWorkspacePublishUsage } from "./publish-usage";

const server = createTestServer();

test.each([
  { base: 10, included: 0, extra: 2, workspaceId: "workspace", limit: 10 },
  { base: 100, included: 2, extra: 2, workspaceId: "workspace", limit: 500 },
  { base: 100, included: 4, extra: 0, workspaceId: null, limit: 500 },
])(
  "uses seat capacity with base $base, $included included and $extra extra seats",
  async ({ base, included, extra, workspaceId, limit }) => {
    server.use(
      db.get("Project", () => json({ userId: "owner", workspaceId })),
      db.get("Product", () => json([{ id: "seats" }])),
      db.get("TransactionLog", ({ request }) => {
        expect(new URL(request.url).searchParams.get("userId")).toBe(
          "eq.owner"
        );
        return json({
          eventData: {
            data: { object: { items: { data: [{ quantity: extra }] } } },
          },
        });
      }),
      db.head("Build", ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(
          params.get(
            workspaceId === null ? "Project.userId" : "Project.workspaceId"
          )
        ).toBe(`eq.${workspaceId ?? "owner"}`);
        expect(params.get("deployment")).toBe("not.is.null");
        return empty({ headers: { "Content-Range": "*/8" } });
      })
    );
    const context = {
      ...testContext,
      getOwnerPlanFeatures: async (ownerId: string) => {
        expect(ownerId).toBe("owner");
        return {
          ...defaultPlanFeatures,
          maxDailyPublishesPerUser: base,
          seatsIncluded: included,
        };
      },
    } as unknown as AppContext;
    await expect(getWorkspacePublishUsage("project", context)).resolves.toEqual(
      { count: 8, limit }
    );
  }
);
