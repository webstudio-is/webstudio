import type { Client } from "@webstudio-is/postgrest/index.server";
import {
  type PlanFeatures,
  PlanFeaturesSchema,
  defaultPlanFeatures,
  parsePlansEnv,
  type Purchase,
} from "./plan-features";

export { parsePlansEnv } from "./plan-features";

type PostgrestContext = { client: Client };

type AuthorizationContext =
  | { type: "token"; ownerId: string }
  | { type: "user"; userId: string }
  | { type: "service" }
  | { type: "anonymous" };

type PlanInfo = {
  planFeatures: PlanFeatures;
  purchases: Array<Purchase>;
};

export const parseProductMeta = (meta: unknown): Partial<PlanFeatures> => {
  const result = PlanFeaturesSchema.partial().safeParse(meta);
  return result.success ? result.data : {};
};

export const mergeProductMetas = (
  productMetas: Array<PlanFeatures>
): PlanFeatures => {
  if (productMetas.length === 0) {
    return defaultPlanFeatures;
  }

  return Object.fromEntries(
    (Object.keys(defaultPlanFeatures) as Array<keyof PlanFeatures>).map(
      (key) => {
        const vals = productMetas.map((item) => item[key]);
        const merged =
          typeof defaultPlanFeatures[key] === "boolean"
            ? (vals as Array<boolean>).some(Boolean)
            : Math.max(...(vals as Array<number>));
        return [key, merged];
      }
    )
  ) as PlanFeatures;
};

export const buildPurchases = (
  userProducts: Array<{
    productId: string | null | undefined;
    subscriptionId: string | null | undefined;
  }>,
  productIdToName: Map<string, string>
): Array<Purchase> => {
  const purchases: Array<Purchase> = [];
  for (const userProduct of userProducts) {
    if (userProduct.productId === null || userProduct.productId === undefined) {
      continue;
    }
    purchases.push({
      planName: productIdToName.get(userProduct.productId) ?? "",
      subscriptionId: userProduct.subscriptionId ?? undefined,
    });
  }
  return purchases;
};

type Product = { id: string; name: string; meta: unknown };

// Products are admin-created and rarely change. Cache them for the lifetime of the
// server instance to avoid a repeated DB round-trip on every request.
// The promise itself is cached to deduplicate concurrent cold-start requests.
let productCachePromise: Promise<Map<string, Product>> | undefined;

const fetchProducts = (
  postgrest: PostgrestContext
): Promise<Map<string, Product>> =>
  Promise.resolve(
    postgrest.client.from("Product").select("id, name, meta")
  ).then((result) => {
    if (result.error) {
      console.error(result.error);
      throw new Error("Failed to fetch products");
    }
    return new Map(result.data.map((p) => [p.id, p as Product]));
  });

const getProductCache = (
  postgrest: PostgrestContext
): Promise<Map<string, Product>> => {
  // Skip caching in test environment so each test gets a fresh fetch.
  if (process.env.VITEST !== undefined) {
    return fetchProducts(postgrest);
  }
  if (productCachePromise !== undefined) {
    return productCachePromise;
  }
  const promise = fetchProducts(postgrest);
  promise.catch(() => {
    productCachePromise = undefined;
  });
  productCachePromise = promise;
  return promise;
};

export const getPlanInfo = async (
  userIds: string[],
  context: { postgrest: PostgrestContext }
): Promise<Map<string, PlanInfo>> => {
  const { postgrest } = context;

  if (userIds.length === 0) {
    return new Map();
  }

  const userProductsResult = await postgrest.client
    .from("UserProduct")
    .select("userId, subscriptionId, productId")
    .in("userId", userIds);

  if (userProductsResult.error) {
    console.error(userProductsResult.error);
    throw new Error("Failed to fetch user products");
  }

  const userProductsByUserId = new Map<
    string,
    Array<{
      productId: string | null;
      subscriptionId: string | null;
    }>
  >();

  for (const row of userProductsResult.data) {
    if (row.userId === null) {
      continue;
    }
    const rows = userProductsByUserId.get(row.userId) ?? [];
    rows.push({
      productId: row.productId,
      subscriptionId: row.subscriptionId,
    });
    userProductsByUserId.set(row.userId, rows);
  }

  const productIds = [
    ...new Set(
      userProductsResult.data.flatMap(({ productId }) =>
        productId === null || productId === undefined ? [] : [productId]
      )
    ),
  ];

  if (productIds.length === 0) {
    return new Map(
      userIds.map((userId) => [
        userId,
        { planFeatures: defaultPlanFeatures, purchases: [] },
      ])
    );
  }

  const allProducts = await getProductCache(postgrest);
  const productById = new Map(
    productIds.flatMap((id) => {
      const product = allProducts.get(id);
      return product !== undefined ? [[id, product] as const] : [];
    })
  );
  const productIdToName = new Map(
    [...productById.values()].map((product) => [product.id, product.name])
  );
  const plansByName = parsePlansEnv(process.env.PLANS ?? "[]");

  return new Map(
    userIds.map((userId) => {
      const userProducts = userProductsByUserId.get(userId) ?? [];
      const productMetas = userProducts.flatMap(({ productId }) => {
        if (productId === null || productId === undefined) {
          return [];
        }
        const product = productById.get(productId);
        if (product === undefined) {
          return [];
        }
        return [
          {
            ...(plansByName.get(product.name)?.features ?? defaultPlanFeatures),
            ...parseProductMeta(product.meta),
          },
        ];
      });

      return [
        userId,
        {
          planFeatures: mergeProductMetas(productMetas),
          purchases: buildPurchases(userProducts, productIdToName),
        },
      ];
    })
  );
};

/**
 * Returns the extra-seat subscription quantity for the given user, derived
 * from the latest customer.subscription.updated/created event in TransactionLog
 * whose product is an extra-seat plan (maxSeatsPerWorkspace > 0, maxWorkspaces <= 1).
 *
 * Returns null when no matching event exists (free plan, no extra seats, etc.).
 */
export const getExtraPaidSeats = async (
  userId: string,
  context: { postgrest: PostgrestContext }
): Promise<number | null> => {
  const productResult = await context.postgrest.client
    .from("Product")
    .select("id")
    .eq("name", "Seats");

  if (productResult.error) {
    throw productResult.error;
  }

  const seatProductIds = (productResult.data ?? []).map((p) => p.id);
  if (seatProductIds.length === 0) {
    return null;
  }

  const result = await context.postgrest.client
    .from("TransactionLog")
    .select("eventData,subscriptionId,eventCreated")
    .eq("userId", userId)
    .in("eventType", [
      "customer.subscription.updated",
      "customer.subscription.created",
    ])
    .in("productId", seatProductIds)
    .order("eventCreated", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    return null;
  }

  // Check if the subscription was cancelled after this event.
  if (result.data.subscriptionId) {
    const deleted = await context.postgrest.client
      .from("TransactionLog")
      .select("eventId")
      .eq("subscriptionId", result.data.subscriptionId)
      .eq("eventType", "customer.subscription.deleted")
      .eq("status", "canceled")
      .gt("eventCreated", result.data.eventCreated)
      .limit(1)
      .maybeSingle();

    if (deleted.error) {
      throw deleted.error;
    }
    if (deleted.data) {
      return null;
    }
  }

  const eventData = result.data.eventData as
    | {
        data?: {
          object?: {
            items?: { data?: Array<{ quantity?: unknown }> };
          };
        };
      }
    | null
    | undefined;
  const rawQuantity = eventData?.data?.object?.items?.data?.[0]?.quantity;
  return typeof rawQuantity === "number" ? rawQuantity : null;
};

export const __testing__ = {
  parseProductMeta,
  mergeProductMetas,
};

export const getAuthorizationOwnerId = (
  authorization: AuthorizationContext
): string | undefined => {
  if (authorization.type === "token") {
    return authorization.ownerId;
  }
  if (authorization.type === "user") {
    return authorization.userId;
  }
  return undefined;
};
