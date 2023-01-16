import { type LoaderArgs, redirect, json } from "@remix-run/node";

import { findAuthenticatedUser } from "~/services/auth.server";
import env from "~/env.server";

import { Login, links } from "~/auth";
import { useLoginErrorMessage } from "~/shared/session";
import { dashboardPath } from "~/shared/router-utils";
import { returnToCookie } from "~/services/cookie.server";

export { links };

const comparePathnames = (pathnameOrUrlA: string, pathnameOrUrlB: string) => {
  const aPathname = new URL(pathnameOrUrlA, "http://localhost").pathname;
  const bPathname = new URL(pathnameOrUrlB, "http://localhost").pathname;
  return aPathname === bPathname;
};

export const loader = async ({ request }: LoaderArgs) => {
  const user = await findAuthenticatedUser(request);

  const url = new URL(request.url);
  let returnTo = url.searchParams.get("returnTo") ?? dashboardPath();

  // Avoid loops
  if (comparePathnames(returnTo, request.url)) {
    returnTo = dashboardPath();
  }

  if (user) {
    return redirect(returnTo);
  }

  const headers = new Headers();
  headers.append("Set-Cookie", await returnToCookie.serialize(returnTo));

  return json(
    {
      isDevLogin: process.env.DEV_LOGIN === "true",
      env,
      isGithubEnabled: Boolean(
        process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET
      ),
      isGoogleEnabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
    { headers }
  );
};

const LoginRoute = () => {
  const errorMessage = useLoginErrorMessage();
  return <Login errorMessage={errorMessage} />;
};

export default LoginRoute;
