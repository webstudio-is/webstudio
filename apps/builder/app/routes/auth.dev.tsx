import { type ActionFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect, setNoStoreToRedirect } from "~/services/no-store-redirect";
import { applyDevPlan } from "@webstudio-is/plans/index.server";
import { createPostgrestContext } from "~/shared/context.server";

export default function Dev() {
  return null;
}

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
      await applyDevPlan(email, planName, {
        postgrest: createPostgrestContext(),
      });
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
