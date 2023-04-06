import type { LoaderArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { returnToPath } from "~/services/cookie.server";

export const loader = async ({ request }: LoaderArgs) => {
  const returnTo = await returnToPath(request);

  return authenticator.authenticate("google", request, {
    successRedirect: returnTo,
    failureRedirect: loginPath({ returnTo }),
  });
};
