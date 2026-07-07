import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  testContext,
  json,
  empty,
} from "@webstudio-is/postgrest/testing";
import { applyDevPlan } from "./dev-plan.server";

const server = createTestServer();

// ─── applyDevPlan ─────────────────────────────────────────────

describe("applyDevPlan (msw)", () => {
  test("does nothing when user is not found", async () => {
    server.use(
      db.get("User", () =>
        json(
          { code: "PGRST116", message: "Row not found", details: "", hint: "" },
          { status: 406 }
        )
      )
    );

    // Should resolve without throwing even when user is missing
    await expect(
      applyDevPlan("ghost@example.com", "Pro", testContext)
    ).resolves.toBeUndefined();
  });

  test("upserts Product and TransactionLog when plan is set", async () => {
    let productUpserted = false;
    let txUpserted = false;

    server.use(
      db.get("User", () => json({ id: "user-1" })),
      db.post("Product", () => {
        productUpserted = true;
        return empty({ status: 201 });
      }),
      db.post("TransactionLog", () => {
        txUpserted = true;
        return empty({ status: 201 });
      })
    );

    await applyDevPlan("dev@example.com", "Pro", testContext);
    expect(productUpserted).toBe(true);
    expect(txUpserted).toBe(true);
  });

  test("deletes TransactionLog when plan is null (free tier)", async () => {
    let txDeleted = false;

    server.use(
      db.get("User", () => json({ id: "user-1" })),
      db.delete("TransactionLog", () => {
        txDeleted = true;
        return empty({ status: 204 });
      })
    );

    await applyDevPlan("dev@example.com", null, testContext);
    expect(txDeleted).toBe(true);
  });

  test("does nothing when Product upsert fails", async () => {
    server.use(
      db.get("User", () => json({ id: "user-1" })),
      db.post("Product", () =>
        json(
          { code: "PGRST000", message: "DB error", details: "", hint: "" },
          { status: 500 }
        )
      )
    );

    // Should resolve (logs error but doesn't throw)
    await expect(
      applyDevPlan("dev@example.com", "Pro", testContext)
    ).resolves.toBeUndefined();
  });
});
