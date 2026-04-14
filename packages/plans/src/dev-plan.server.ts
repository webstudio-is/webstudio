import type { Client } from "@webstudio-is/postgrest/index.server";
import { defaultPlanFeatures, type PlanFeatures } from "./plan-features";

type PostgrestContext = { client: Client };

/**
 * Full feature set for self-hosted dev plans.
 * Mirrors what a paid Stripe webhook would write into Product.meta on SaaS.
 * All boolean flags enabled, numeric limits set to generous self-host defaults.
 */
const devPlanMeta: PlanFeatures = {
  ...defaultPlanFeatures,
  canDownloadAssets: true,
  canRestoreBackups: true,
  allowAdditionalPermissions: true,
  allowDynamicData: true,
  allowContentMode: true,
  allowStagingPublish: true,
  maxContactEmailsPerProject: 1000,
  maxDomainsAllowedPerUser: 1000,
  maxDailyPublishesPerUser: 1000,
  maxWorkspaces: 100,
  maxProjectsAllowedPerUser: 1000,
  maxAssetsPerProject: 10000,
  maxSeatsPerWorkspace: 100,
};

/**
 * Upsert or delete dev plan rows in the DB for the given user email.
 * This lets getPlanInfo work naturally (same as production) for all callers,
 * including getOwnerPlanFeatures for shared-workspace suspension checks.
 *
 * - Plan selected: upsert a Product row (id = "dev-product-{planName}") and a
 *   TransactionLog row (eventId = "dev-{userId}") that satisfies the UserProduct view.
 * - No plan selected: delete the TransactionLog row so the user has no active purchase.
 */
export const applyDevPlan = async (
  email: string,
  planName: string | null,
  context: { postgrest: PostgrestContext }
) => {
  const { postgrest } = context;
  // Resolve userId from email (user was already created by the authenticator).
  const userResult = await postgrest.client
    .from("User")
    .select("id")
    .eq("email", email)
    .single();

  if (userResult.error) {
    console.error("[applyDevPlan] Failed to find user:", userResult.error);
    return;
  }

  const userId = userResult.data?.id as string | undefined;
  if (!userId) {
    console.error("[applyDevPlan] No user found for email:", email);
    return;
  }

  if (planName !== null) {
    const productId = `dev-product-${planName}`;

    const productResult = await postgrest.client.from("Product").upsert({
      id: productId,
      name: planName,
      // Write full features into meta so getPlanInfo works without PLANS env var,
      // mirroring what a Stripe webhook would do in production.
      meta: devPlanMeta,
      features: [],
      images: [],
    });
    if (productResult.error) {
      console.error(
        "[applyDevPlan] Failed to upsert Product:",
        productResult.error
      );
      return;
    }

    const txResult = await postgrest.client.from("TransactionLog").upsert({
      eventId: `dev-${userId}`,
      userId,
      productId,
      eventData: {
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1000),
        data: { object: { status: "complete" } },
      },
    });
    if (txResult.error) {
      console.error(
        "[applyDevPlan] Failed to upsert TransactionLog:",
        txResult.error
      );
    }
  } else {
    // Remove any existing dev plan row — the user becomes free tier.
    const deleteResult = await postgrest.client
      .from("TransactionLog")
      .delete()
      .eq("eventId", `dev-${userId}`);
    if (deleteResult.error) {
      console.error(
        "[applyDevPlan] Failed to delete TransactionLog:",
        deleteResult.error
      );
    }
  }
};
