import {
  type PlanFeatures,
  defaultPlanFeatures,
  parsePlansEnv,
  type Purchase,
} from "@webstudio-is/trpc-interface/plan-features";
import env from "~/env/env.server";

export { parsePlansEnv } from "@webstudio-is/trpc-interface/plan-features";

type PlanInfo = {
  planFeatures: PlanFeatures;
  purchases: Array<Purchase>;
};

/**
 * @deprecated Temporary self-hosted fallback — resolves plan features from the PLANS env.
 * TODO: Replace with a `POST /plans` call to the payment worker (task W2).
 * Once the worker endpoint is live:
 *   1. Add `fetch-extras` back and wire up `workerFetch` (see B2a in the migration plan).
 *   2. Call `POST ${env.PAYMENT_WORKER_URL}/plans` with `{ userIds }` when the worker is configured.
 *   3. Keep the PLANS-env path only as the self-hosted fallback (no worker configured).
 *   4. Delete `resolvePlanFeatures` and `selfHostedPlanInfo` once the worker handles self-hosted too.
 */
const resolvePlanFeatures = (): PlanFeatures => {
  if (!env.PLANS) {
    return defaultPlanFeatures;
  }
  const plans = parsePlansEnv(env.PLANS);
  return plans.values().next().value ?? defaultPlanFeatures;
};

const selfHostedPlanInfo: PlanInfo = {
  planFeatures: resolvePlanFeatures(),
  purchases: [],
};

/**
 * Create a per-request plan info loader.
 * Returns plan features resolved from the PLANS env for every userId.
 * All users share the same plan (self-hosted: first plan in PLANS, or defaultPlanFeatures).
 */
export const createPlanInfoLoader = () => {
  const getPlanInfo = async (
    userIds: string[]
  ): Promise<Map<string, PlanInfo>> => {
    return new Map(userIds.map((id) => [id, selfHostedPlanInfo]));
  };

  return { getPlanInfo };
};
