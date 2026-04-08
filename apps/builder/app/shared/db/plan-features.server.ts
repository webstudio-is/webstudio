import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  type PlanFeatures,
  PlanFeaturesSchema,
  defaultPlanFeatures,
} from "@webstudio-is/trpc-interface/plan-features";
import env from "~/env/env.server";

type PlanInfo = {
  planFeatures: PlanFeatures;
  purchases: AppContext["purchases"];
};

/**
 * Safely extract known plan-feature overrides from an untyped product.meta blob.
 * Unknown keys are stripped; invalid values fall back to the caller's defaults.
 */
const parseProductMeta = (meta: unknown): Partial<PlanFeatures> => {
  const result = PlanFeaturesSchema.partial().safeParse(meta);
  return result.success ? result.data : {};
};

/**
 * Merge plan features from multiple products.
 * Booleans are merged with OR (any product enables it), numbers with max.
 */
const mergeProductMetas = (productMetas: PlanFeatures[]): PlanFeatures => {
  if (productMetas.length === 0) {
    return defaultPlanFeatures;
  }

  return Object.fromEntries(
    (Object.keys(defaultPlanFeatures) as Array<keyof PlanFeatures>).map(
      (key) => {
        const vals = productMetas.map((item) => item[key]);
        const merged =
          typeof defaultPlanFeatures[key] === "boolean"
            ? (vals as boolean[]).some(Boolean)
            : Math.max(...(vals as number[]));
        return [key, merged];
      }
    )
  ) as PlanFeatures;
};

/**
 * Parse the PLANS env variable (JSON array of {name, extends?, features}).
 * - features is partial when extends is used; the parent plan fills in the rest.
 * - The final merged features are validated against the full PlanFeaturesSchema.
 * - Invalid entries are skipped with a console.error.
 * - An extends reference to an unknown plan name throws an error.
 * Returns a Map of plan name → resolved PlanFeatures.
 */
const parsePlansEnv = (raw: string): Map<string, PlanFeatures> => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();

    type PlanEntry = {
      name: string;
      extends?: string;
      features: Partial<PlanFeatures>;
    };

    // First pass: validate entry structure and collect partial features.
    const entries: PlanEntry[] = parsed.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.name !== "string" ||
        !("features" in item)
      ) {
        console.error("Invalid PLANS entry (missing name or features):", item);
        return [];
      }
      if ("extends" in item && typeof item.extends !== "string") {
        console.error("Invalid PLANS entry (extends must be a string):", item);
        return [];
      }
      const result = PlanFeaturesSchema.partial().safeParse(item.features);
      if (!result.success) {
        console.error(
          `Invalid PLANS entry "${item.name}" features:`,
          result.error.flatten()
        );
        return [];
      }
      return [
        {
          name: item.name,
          extends: "extends" in item ? (item.extends as string) : undefined,
          features: result.data,
        } satisfies PlanEntry,
      ];
    });

    // Build name → partial features map for resolving extends.
    const byName = new Map<string, Partial<PlanFeatures>>(
      entries.map((e) => [e.name, e.features])
    );

    // Second pass: resolve extends and validate the full feature set.
    // Every entry implicitly extends defaultPlanFeatures; "extends" picks a named plan on top of that.
    const resolved = new Map<string, PlanFeatures>();
    for (const entry of entries) {
      if (entry.extends !== undefined && !byName.has(entry.extends)) {
        throw new Error(
          `PLANS entry "${entry.name}" extends unknown plan "${entry.extends}"`
        );
      }
      const parentFeatures: PlanFeatures =
        entry.extends === undefined
          ? defaultPlanFeatures
          : { ...defaultPlanFeatures, ...byName.get(entry.extends)! };
      const result = PlanFeaturesSchema.safeParse({
        ...parentFeatures,
        ...entry.features,
      });
      if (!result.success) {
        console.error(
          `Invalid PLANS entry "${entry.name}" features after resolving extends:`,
          result.error.flatten()
        );
        continue;
      }
      resolved.set(entry.name, result.data);
    }
    return resolved;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PLANS entry")) {
      throw error;
    }
    return new Map();
  }
};

const buildPurchases = (
  userProducts: Array<{
    productId: string | null | undefined;
    subscriptionId: string | null | undefined;
  }>,
  productIdToName: Map<string, string>
): PlanInfo["purchases"] => {
  const purchases: PlanInfo["purchases"] = [];
  for (const userProduct of userProducts) {
    if (userProduct.productId) {
      const planName = productIdToName.get(userProduct.productId) ?? "";
      purchases.push({
        planName,
        subscriptionId: userProduct.subscriptionId ?? undefined,
      });
    }
  }
  return purchases;
};

export const getPlanInfo = async (
  userId: string,
  postgrest: AppContext["postgrest"]
): Promise<PlanInfo> => {
  const userProductsResult = await postgrest.client
    .from("UserProduct")
    .select("customerId, subscriptionId, productId")
    .eq("userId", userId);

  if (userProductsResult.error) {
    console.error(userProductsResult.error);
    throw new Error("Failed to fetch user products");
  }

  const userProducts = userProductsResult.data;

  // Filter out null/undefined productIds before querying
  const productIds = userProducts.flatMap(({ productId }) =>
    productId !== null && productId !== undefined ? [productId] : []
  );

  if (productIds.length > 0) {
    const productsResult = await postgrest.client
      .from("Product")
      .select("id, name, meta")
      .in("id", productIds);

    if (productsResult.error) {
      console.error(productsResult.error);
      throw new Error("Failed to fetch products");
    }

    const products = productsResult.data;
    const productIdToName = new Map(products.map((p) => [p.id, p.name]));

    // Look up each product's plan by name in PLANS env, falling back to defaultPlanFeatures.
    // Product meta is applied on top as per-product overrides.
    const plansByName = parsePlansEnv(env.PLANS);
    const productMetas = products.map((product) => ({
      ...(plansByName.get(product.name) ?? defaultPlanFeatures),
      ...parseProductMeta(product.meta),
    }));

    return {
      planFeatures: mergeProductMetas(productMetas),
      purchases: buildPurchases(userProducts, productIdToName),
    };
  }

  const plansByName = parsePlansEnv(env.PLANS);
  if (plansByName.size > 0) {
    return {
      planFeatures: mergeProductMetas([...plansByName.values()]),
      purchases: [],
    };
  }

  return {
    planFeatures: defaultPlanFeatures,
    purchases: [],
  };
};

export const __testing__ = {
  parseProductMeta,
  mergeProductMetas,
  parsePlansEnv,
};
