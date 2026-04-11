import {
  type PlanFeatures,
  PlanFeaturesSchema,
  defaultPlanFeatures,
  parsePlansEnv,
  type Purchase,
} from "./plan-features";
import type { AppContext } from "../context/context.server";

export { parsePlansEnv } from "./plan-features";

type PlanInfo = {
  planFeatures: PlanFeatures;
  purchases: Array<Purchase>;
};

const parseProductMeta = (meta: unknown): Partial<PlanFeatures> => {
  const result = PlanFeaturesSchema.partial().safeParse(meta);
  return result.success ? result.data : {};
};

const mergeProductMetas = (productMetas: Array<PlanFeatures>): PlanFeatures => {
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

const buildPurchases = (
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

export const getPlanInfo = async (
  userIds: string[],
  context: Pick<AppContext, "postgrest">
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

  const productsResult = await postgrest.client
    .from("Product")
    .select("id, name, meta")
    .in("id", productIds);

  if (productsResult.error) {
    console.error(productsResult.error);
    throw new Error("Failed to fetch products");
  }

  const productById = new Map(
    productsResult.data.map((product) => [product.id, product])
  );
  const productIdToName = new Map(
    productsResult.data.map((product) => [product.id, product.name])
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

export const __testing__ = { parseProductMeta, mergeProductMetas };

export const getAuthorizationOwnerId = (
  authorization: AppContext["authorization"]
): string | undefined => {
  if (authorization.type === "token") {
    return authorization.ownerId;
  }
  if (authorization.type === "user") {
    return authorization.userId;
  }
  return undefined;
};
