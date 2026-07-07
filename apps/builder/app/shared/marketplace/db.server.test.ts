import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  testContext,
  json,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { getItems } from "./db.server";

const server = createTestServer();

const ctx = testContext as unknown as AppContext;

const marketplaceProductJson = JSON.stringify({
  category: "sectionTemplates",
  name: "My Section",
  thumbnailAssetId: "asset-thumb",
  author: "Author Name",
  email: "author@example.com",
  website: "https://example.com",
  issues: "",
  description: "A nice section template for testing purposes.",
});

// ─── getItems ─────────────────────────────────────────────────

describe("getItems (msw)", () => {
  test("returns empty array when no marketplace products", async () => {
    server.use(db.get("ApprovedMarketplaceProduct", () => json([])));

    const result = await getItems(ctx);
    expect(result).toEqual([]);
  });

  test("skips products with null marketplaceProduct or projectId", async () => {
    server.use(
      db.get("ApprovedMarketplaceProduct", () =>
        json([
          {
            id: "1",
            projectId: null,
            marketplaceProduct: marketplaceProductJson,
            authorizationToken: null,
          },
          {
            id: "2",
            projectId: "proj-1",
            marketplaceProduct: null,
            authorizationToken: null,
          },
        ])
      )
    );

    const result = await getItems(ctx);
    expect(result).toHaveLength(0);
  });

  test("skips products with invalid marketplaceProduct JSON", async () => {
    server.use(
      db.get("ApprovedMarketplaceProduct", () =>
        json([
          {
            id: "1",
            projectId: "proj-1",
            // Category not in enum → parse fails
            marketplaceProduct: JSON.stringify({
              category: "invalid",
              name: "x",
            }),
            authorizationToken: null,
          },
        ])
      )
    );

    const result = await getItems(ctx);
    expect(result).toHaveLength(0);
  });

  test("returns items with thumbnailAssetName when asset exists", async () => {
    server.use(
      db.get("ApprovedMarketplaceProduct", () =>
        json([
          {
            id: "1",
            projectId: "proj-1",
            marketplaceProduct: marketplaceProductJson,
            authorizationToken: "tok-abc",
          },
        ])
      ),
      db.get("Asset", () =>
        json([{ id: "asset-thumb", name: "thumb.png", projectId: "proj-1" }])
      )
    );

    const result = await getItems(ctx);
    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe("proj-1");
    expect(result[0].authorizationToken).toBe("tok-abc");
    expect(result[0].thumbnailAssetName).toBe("thumb.png");
  });

  test("returns items without thumbnailAssetName when asset missing", async () => {
    server.use(
      db.get("ApprovedMarketplaceProduct", () =>
        json([
          {
            id: "1",
            projectId: "proj-1",
            marketplaceProduct: marketplaceProductJson,
            authorizationToken: null,
          },
        ])
      ),
      db.get("Asset", () => json([]))
    );

    const result = await getItems(ctx);
    expect(result).toHaveLength(1);
    expect(result[0].thumbnailAssetName).toBeUndefined();
  });
});
