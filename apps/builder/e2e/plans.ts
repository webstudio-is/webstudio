import { parsePlansEnv } from "@webstudio-is/plans";
import env from "../app/env/env.server";

const plans = parsePlansEnv(env.PLANS);

const getE2ePaidPlanName = () => {
  const planName = [...plans.values()].find(
    ({ features }) =>
      features.allowAdditionalPermissions && features.allowContentMode
  )?.name;
  if (planName !== undefined) {
    return planName;
  }
  throw new Error(
    "Expected PLANS to include a plan with allowAdditionalPermissions and allowContentMode for e2e"
  );
};

export const e2ePaidPlanName = getE2ePaidPlanName();
