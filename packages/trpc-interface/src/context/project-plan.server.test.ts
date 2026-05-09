import { describe, expect, test } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import type { AppContext } from "./context.server";
import {
  getPlanFeaturesByOwnerId,
  getProjectOwnerId,
  getProjectPlanFeatures,
} from "./project-plan.server";

const server = createTestServer();

const createContext = (
  getOwnerPlanFeatures: AppContext["getOwnerPlanFeatures"] = async () =>
    defaultPlanFeatures
): AppContext =>
  ({
    ...testContext,
    getOwnerPlanFeatures,
  }) as unknown as AppContext;

describe("project plan helpers", () => {
  test("resolves project owner id from Project.userId and caches it per context", async () => {
    let projectQueries = 0;
    server.use(
      db.get("Project", () => {
        projectQueries += 1;
        return json({ userId: "owner-1" });
      })
    );

    const context = createContext();

    await expect(getProjectOwnerId("project-1", context)).resolves.toBe(
      "owner-1"
    );
    await expect(getProjectOwnerId("project-1", context)).resolves.toBe(
      "owner-1"
    );

    expect(projectQueries).toBe(1);
  });

  test("resolves project plan features from the project owner and caches owner plan", async () => {
    const ownerPlanCalls: string[] = [];
    server.use(db.get("Project", () => json({ userId: "owner-1" })));

    const context = createContext(async (ownerId) => {
      ownerPlanCalls.push(ownerId);
      return {
        ...defaultPlanFeatures,
        maxAssetsPerProject: 350,
      };
    });

    await expect(
      getProjectPlanFeatures("project-1", context)
    ).resolves.toMatchObject({
      maxAssetsPerProject: 350,
    });
    await expect(
      getProjectPlanFeatures("project-1", context)
    ).resolves.toMatchObject({
      maxAssetsPerProject: 350,
    });

    expect(ownerPlanCalls).toEqual(["owner-1"]);
  });

  test("rejects projects without an owner and retries after the failed cache entry is cleared", async () => {
    let projectQueries = 0;
    server.use(
      db.get("Project", () => {
        projectQueries += 1;
        return json({
          userId: projectQueries === 1 ? null : "owner-2",
        });
      })
    );

    const context = createContext();

    await expect(getProjectOwnerId("project-2", context)).rejects.toThrow(
      "Project must have project userId defined"
    );
    await expect(getProjectOwnerId("project-2", context)).resolves.toBe(
      "owner-2"
    );
    expect(projectQueries).toBe(2);
  });

  test("clears failed owner-plan cache entries before retrying", async () => {
    let ownerPlanCalls = 0;
    const context = createContext(async () => {
      ownerPlanCalls += 1;
      if (ownerPlanCalls === 1) {
        throw new Error("temporary plan failure");
      }
      return {
        ...defaultPlanFeatures,
        maxDomainsAllowedPerUser: 5,
      };
    });

    await expect(getPlanFeaturesByOwnerId("owner-3", context)).rejects.toThrow(
      "temporary plan failure"
    );
    await expect(
      getPlanFeaturesByOwnerId("owner-3", context)
    ).resolves.toMatchObject({
      maxDomainsAllowedPerUser: 5,
    });
    expect(ownerPlanCalls).toBe(2);
  });
});
