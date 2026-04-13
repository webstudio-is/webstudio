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
            ...(plansByName.get(product.name) ?? defaultPlanFeatures),
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
 * Returns the Stripe subscription item quantity for the given user, derived
 * from the latest customer.subscription.updated/created event in TransactionLog.
 * Returns null when no subscription event exists yet (free plan, AppSumo, etc.).
 */
export const getPaidSeats = async (
  userId: string,
  context: { postgrest: PostgrestContext }
): Promise<number | null> => {
  const result = await context.postgrest.client
    .from("TransactionLog")
    .select("eventData")
    .eq("userId", userId)
    .in("eventType", [
      "customer.subscription.updated",
      "customer.subscription.created",
    ])
    .order("eventCreated", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  const eventData = result.data?.eventData as
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
