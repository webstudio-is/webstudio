import type { ComponentProps } from "react";
import {
  type LoaderFunctionArgs,
  type TypedResponse,
  redirect,
  json,
} from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import { findAuthenticatedUser } from "~/services/auth.server";
import env from "~/env/env.server";
import { Login } from "~/auth";
import { useLoginErrorMessage } from "~/shared/session";
import { dashboardPath } from "~/shared/router-utils";
import { returnToCookie } from "~/services/cookie.server";

const comparePathnames = (pathnameOrUrlA: string, pathnameOrUrlB: string) => {
  const aPathname = new URL(pathnameOrUrlA, "http://localhost").pathname;
  const bPathname = new URL(pathnameOrUrlB, "http://localhost").pathname;
  return aPathname === bPathname;
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<
  TypedResponse<ComponentProps<typeof Login>>
> => {
  const user = await findAuthenticatedUser(request);

  const url = new URL(request.url);
  let returnTo = url.searchParams.get("returnTo") ?? dashboardPath();

  // Avoid loops
  if (comparePathnames(returnTo, request.url)) {
    returnTo = dashboardPath();
  }

  if (user) {
    throw redirect(returnTo);
  }

  const headers = new Headers();
  headers.append("Set-Cookie", await returnToCookie.serialize(returnTo));

  return json(
    {
      isSecretLoginEnabled: env.DEV_LOGIN === "true",
      isGithubEnabled: Boolean(env.GH_CLIENT_ID && env.GH_CLIENT_SECRET),
      isGoogleEnabled: Boolean(
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ),
    },
    { headers }
  );
};

const LoginRoute = () => {
  const errorMessage = useLoginErrorMessage();
  const data = useLoaderData<typeof loader>();
  return <Login {...data} errorMessage={errorMessage} />;
};

export default LoginRoute;
