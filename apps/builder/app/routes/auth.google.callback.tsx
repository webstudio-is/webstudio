import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { returnToPath } from "~/services/cookie.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const returnTo = await returnToPath(request);

  return authenticator.authenticate("google", request, {
    successRedirect: returnTo,
    failureRedirect: loginPath({ returnTo }),
  });
};
