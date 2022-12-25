import type { LoaderArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, loginPath } from "~/shared/router-utils";

export const loader = async ({ request }: LoaderArgs) => {
  return authenticator.authenticate("google", request, {
    successRedirect: dashboardPath(),
    failureRedirect: loginPath({}),
  });
};
