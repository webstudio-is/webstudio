import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  createTestServer,
  db,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { type PlanFeatures, defaultPlanFeatures } from "./plan-features";
import {
  getPlanInfo,
  getExtraPaidSeats,
  __testing__,
} from "./plan-client.server";

const { parseProductMeta, mergeProductMetas } = __testing__;

// ---------------------------------------------------------------------------
// Unit tests for private helpers
// ---------------------------------------------------------------------------

const server = createTestServer();

beforeEach(() => {
  vi.unstubAllEnvs();
});

const proProduct = {
  id: "prod-pro",
  name: "Pro",
  meta: { maxDomainsAllowedPerUser: 10 },
};

const proUserProduct = {
  userId: "user-1",
  productId: "prod-pro",
  subscriptionId: "sub-abc",
};

describe("getPlanInfo (msw)", () => {
  test("empty userIds returns empty map without hitting DB", async () => {
    const result = await getPlanInfo([], testContext);
    expect(result.size).toBe(0);
  });

  test("user with no products returns defaultPlanFeatures", async () => {
    server.use(db.get("UserProduct", () => json([])));

    const result = await getPlanInfo(["user-1"], testContext);
    expect(result.get("user-1")).toEqual({
      planFeatures: defaultPlanFeatures,
      purchases: [],
    });
  });

  test("user with one product resolves plan features from PLANS env + meta merge", async () => {
    vi.stubEnv(
      "PLANS",
      JSON.stringify([{ name: "Pro", maxDomainsAllowedPerUser: 5 }])
    );
    server.use(
      db.get("UserProduct", () => json([proUserProduct])),
      db.get("Product", () => json([proProduct]))
    );

    const result = await getPlanInfo(["user-1"], testContext);
    const info = result.get("user-1");
    // meta overrides env plan: maxDomainsAllowedPerUser should be 10 (from meta)
    expect(info?.planFeatures.maxDomainsAllowedPerUser).toBe(10);
    expect(info?.purchases).toEqual([
      { planName: "Pro", subscriptionId: "sub-abc" },
    ]);
  });

  test("product not in PLANS falls back to defaultPlanFeatures for that product", async () => {
    vi.stubEnv("PLANS", JSON.stringify([]));
    server.use(
      db.get("UserProduct", () => json([proUserProduct])),
      db.get("Product", () => json([proProduct]))
    );

    const result = await getPlanInfo(["user-1"], testContext);
    const info = result.get("user-1");
    // meta provides maxDomainsAllowedPerUser: 10, rest from defaultPlanFeatures
    expect(info?.planFeatures.maxDomainsAllowedPerUser).toBe(10);
    expect(info?.planFeatures.canDownloadAssets).toBe(
      defaultPlanFeatures.canDownloadAssets
    );
  });

  test("multiple users batched in one UserProduct query", async () => {
    vi.stubEnv("PLANS", JSON.stringify([]));
    server.use(
      db.get("UserProduct", ({ request }) => {
        const url = new URL(request.url);
        // PostgREST IN filter: userId=in.(user-1,user-2)
        expect(url.searchParams.get("userId")).toMatch(/user-1/);
        expect(url.searchParams.get("userId")).toMatch(/user-2/);
        return json([
          proUserProduct,
          { userId: "user-2", productId: "prod-pro", subscriptionId: null },
        ]);
      }),
      db.get("Product", () => json([proProduct]))
    );

    const result = await getPlanInfo(["user-1", "user-2"], testContext);
    expect(result.size).toBe(2);
    expect(result.get("user-1")?.purchases[0].planName).toBe("Pro");
    expect(result.get("user-2")?.purchases[0].subscriptionId).toBeUndefined();
  });

  test("UserProduct DB error throws", async () => {
    server.use(
      db.get("UserProduct", () =>
        json({ message: "db error" }, { status: 500 })
      )
    );

    await expect(getPlanInfo(["user-1"], testContext)).rejects.toThrow(
      "Failed to fetch user products"
    );
  });

  test("Product DB error throws and cache is cleared for retry", async () => {
    server.use(
      db.get("UserProduct", () => json([proUserProduct])),
      db.get("Product", () => json({ message: "db error" }, { status: 500 }))
    );

    await expect(getPlanInfo(["user-1"], testContext)).rejects.toThrow(
      "Failed to fetch products"
    );

    // After error the cache is cleared — next call should hit DB again
    server.use(
      db.get("UserProduct", () => json([proUserProduct])),
      db.get("Product", () => json([proProduct]))
    );
    vi.stubEnv("PLANS", JSON.stringify([]));
    const result = await getPlanInfo(["user-1"], testContext);
    expect(result.get("user-1")?.purchases[0].planName).toBe("Pro");
  });
});

/** Full-featured plan for use in tests — all booleans true, numeric limits at max */
const fullFeatures: PlanFeatures = {
  ...defaultPlanFeatures,
  canDownloadAssets: true,
  canRestoreBackups: true,
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmailsPerProject: 5,
  maxDomainsAllowedPerUser: 100,
  maxDailyPublishesPerUser: 100,
  maxWorkspaces: 1,
  maxProjectsAllowedPerUser: 100,
};

describe("parseProductMeta", () => {
  test("extracts known keys from a valid object", () => {
    const result = parseProductMeta({
      maxContactEmailsPerProject: 10,
      canDownloadAssets: true,
    });
    expect(result).toEqual({
      maxContactEmailsPerProject: 10,
      canDownloadAssets: true,
    });
  });

  test("strips unknown keys", () => {
    const result = parseProductMeta({
      admin: true,
      maxContactEmailsPerProject: 3,
    });
    expect(result).toEqual({ maxContactEmailsPerProject: 3 });
  });

  test("returns empty object for non-object input", () => {
    expect(parseProductMeta("not an object")).toEqual({});
    expect(parseProductMeta(42)).toEqual({});
    expect(parseProductMeta(undefined)).toEqual({});
  });

  test("returns empty object for null input", () => {
    expect(parseProductMeta(null)).toEqual({});
  });

  test("rejects negative numbers", () => {
    const result = parseProductMeta({ maxContactEmailsPerProject: -1 });
    expect(result).toEqual({});
  });

  test("accepts zero for numeric fields", () => {
    const result = parseProductMeta({ maxWorkspaces: 0 });
    expect(result).toEqual({ maxWorkspaces: 0 });
  });

  test("rejects wrong types for fields", () => {
    const result = parseProductMeta({
      canDownloadAssets: "yes",
      maxContactEmailsPerProject: "five",
    });
    expect(result).toEqual({});
  });
});

describe("mergeProductMetas", () => {
  test("booleans: true if ANY product grants the feature", () => {
    const result = mergeProductMetas([
      { ...fullFeatures, canDownloadAssets: false, canRestoreBackups: true },
      { ...fullFeatures, canDownloadAssets: true, canRestoreBackups: false },
    ]);
    expect(result.canDownloadAssets).toBe(true);
    expect(result.canRestoreBackups).toBe(true);
  });

  test("booleans: false when NO product grants the feature", () => {
    const result = mergeProductMetas([
      { ...fullFeatures, canDownloadAssets: false },
      { ...fullFeatures, canDownloadAssets: false },
    ]);
    expect(result.canDownloadAssets).toBe(false);
  });

  test("numbers: takes the highest value across products", () => {
    const result = mergeProductMetas([
      { ...fullFeatures, maxContactEmailsPerProject: 3, maxWorkspaces: 2 },
      { ...fullFeatures, maxContactEmailsPerProject: 10, maxWorkspaces: 5 },
    ]);
    expect(result.maxContactEmailsPerProject).toBe(10);
    expect(result.maxWorkspaces).toBe(5);
  });

  test("single product returns its values unchanged", () => {
    const plan = { ...fullFeatures, maxWorkspaces: 7 };
    const result = mergeProductMetas([plan]);
    expect(result).toEqual(plan);
  });

  test("empty array returns defaultPlanFeatures", () => {
    const result = mergeProductMetas([]);
    expect(result).toEqual(defaultPlanFeatures);
  });
});

describe("workspaces plan", () => {
  test("merging pro + workspaces product picks highest maxWorkspaces", () => {
    const proProduct = { ...fullFeatures, maxWorkspaces: 1 };
    const workspacesProduct = { ...defaultPlanFeatures, maxWorkspaces: 20 };

    const result = mergeProductMetas([proProduct, workspacesProduct]);
    expect(result.maxWorkspaces).toBe(20);
    expect(result.canDownloadAssets).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getExtraPaidSeats
// ---------------------------------------------------------------------------

const seatProduct = { id: "prod-seats" };

const subscriptionEvent = (quantity: number, subscriptionId = "sub-seats") => ({
  subscriptionId,
  eventCreated: 1000,
  eventData: {
    data: { object: { items: { data: [{ quantity }] } } },
  },
});

const setupSeatMocks = ({
  productRows = [seatProduct],
  transactionRow = subscriptionEvent(2) as Record<string, unknown> | null,
  deletedRow = null as Record<string, unknown> | null,
}: {
  productRows?: Array<{ id: string }>;
  transactionRow?: Record<string, unknown> | null;
  deletedRow?: Record<string, unknown> | null;
} = {}) => {
  server.use(
    db.get("Product", () => json(productRows)),
    db.get("TransactionLog", ({ request }) => {
      const url = new URL(request.url);
      const eventType = url.searchParams.get("eventType");
      // Deletion check query uses eq filter
      if (eventType === "eq.customer.subscription.deleted") {
        return json(deletedRow ? [deletedRow] : []);
      }
      // Main query uses in filter
      return json(transactionRow ? [transactionRow] : []);
    })
  );
};

describe("getExtraPaidSeats", () => {
  test("returns quantity from latest subscription event", async () => {
    setupSeatMocks({ transactionRow: subscriptionEvent(3) });
    const result = await getExtraPaidSeats("user-1", testContext);
    expect(result).toBe(3);
  });

  test("returns null when no Seats product exists", async () => {
    setupSeatMocks({ productRows: [] });
    const result = await getExtraPaidSeats("user-1", testContext);
    expect(result).toBeNull();
  });

  test("returns null when no subscription event exists", async () => {
    setupSeatMocks({ transactionRow: null });
    const result = await getExtraPaidSeats("user-1", testContext);
    expect(result).toBeNull();
  });

  test("returns null when subscription was deleted after the latest event", async () => {
    setupSeatMocks({
      transactionRow: subscriptionEvent(2),
      deletedRow: { eventId: "evt-del" },
    });
    const result = await getExtraPaidSeats("user-1", testContext);
    expect(result).toBeNull();
  });

  test("returns quantity when no deletion event exists", async () => {
    setupSeatMocks({
      transactionRow: subscriptionEvent(5),
      deletedRow: null,
    });
    const result = await getExtraPaidSeats("user-1", testContext);
    expect(result).toBe(5);
  });

  test("returns null when eventData has no quantity", async () => {
    setupSeatMocks({
      transactionRow: {
        subscriptionId: "sub-seats",
        eventCreated: 1000,
        eventData: { data: { object: {} } },
      },
    });
    const result = await getExtraPaidSeats("user-1", testContext);
    expect(result).toBeNull();
  });
});
