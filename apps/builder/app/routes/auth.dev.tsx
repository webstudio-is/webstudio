import { type ActionFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect, setNoStoreToRedirect } from "~/services/no-store-redirect";
import { createPostgrestContext } from "~/shared/context.server";

export default function Dev() {
  return null;
}

/**
 * Upsert or delete dev plan rows in the DB for the given user email.
 * This lets getPlanInfo work naturally (same as production) for all callers,
 * including getOwnerPlanFeatures for shared-workspace suspension checks.
 *
 * - Plan selected: upsert a Product row (id = "dev-product-{planName}") and a
 *   TransactionLog row (eventId = "dev-{userId}") that satisfies the UserProduct view.
 * - No plan selected: delete the TransactionLog row so the user has no active purchase.
 */
const applyDevPlan = async (email: string, planName: string | null) => {
  const postgrest = createPostgrestContext();

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
      meta: {},
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

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);

  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const returnTo = (await returnToPath(request)) ?? dashboardPath();

  // Clone before authenticator consumes the body.
  const formData = await request.clone().formData();
  const devPlanRaw = formData.get("devPlan");
  const planName =
    typeof devPlanRaw === "string" && devPlanRaw !== "" ? devPlanRaw : null;
  const emailRaw = formData.get("email");
  const email =
    typeof emailRaw === "string" && emailRaw.trim() !== ""
      ? emailRaw.trim()
      : "hello@webstudio.is";

  try {
    await authenticator.authenticate("dev", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error: unknown) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      const response = await clearReturnToCookie(request, error);
      // Write the selected dev plan directly into the DB so that getPlanInfo
      // reads it naturally for any user (including owner lookups from other sessions).
      await applyDevPlan(email, planName);
      return setNoStoreToRedirect(response);
    }

    if (error instanceof Error) {
      console.error("Error authenticating with dev", error);
      return redirect(
        loginPath({
          error: AUTH_PROVIDERS.LOGIN_DEV,
          message: error?.message,
          returnTo,
        })
      );
    }
  }
};
