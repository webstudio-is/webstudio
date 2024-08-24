import { json, type LoaderFunction } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { isBuilder } from "~/shared/router-utils";

export const loader: LoaderFunction = async ({ request }) => {
  preventCrossOriginCookie(request);

  const authenticatorService = isBuilder(request)
    ? builderAuthenticator
    : authenticator;

  const user = authenticatorService.isAuthenticated(request);

  return json({
    message: "If you see other user then data leaked",
    leak: user,
  });
};
