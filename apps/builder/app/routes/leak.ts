import { json, type LoaderFunction } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { isBuilder } from "~/shared/router-utils";
import { sessionStorage } from "~/services/session.server";
import { builderSessionStorage } from "~/services/builder-session.server";
import env from "~/env/env.server";

/**
 * This route is designed to test for potential data leakage.
 * Will be removed.
 * @todo Remove this route
 */
export const loader: LoaderFunction = async ({ request }) => {
  if (env.DEPLOYMENT_ENVIRONMENT === "production") {
    throw new Error("This route is only for development");
  }

  preventCrossOriginCookie(request);

  const authenticatorService = isBuilder(request)
    ? builderAuthenticator
    : authenticator;

  const user = authenticatorService.isAuthenticated(request);

  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  console.info("session", session.data);

  const builderSession = await builderSessionStorage.getSession(
    request.headers.get("Cookie")
  );

  return json({
    message: "If you see other user then data leaked",
    leak: user,
    data: session.data,
    builderData: builderSession.data,
  });
};
