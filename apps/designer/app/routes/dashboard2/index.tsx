import { useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Dashboard } from "~/dashboard2";
import { findAuthenticatedUser } from "~/services/auth.server";
import { User as DbUser } from "@webstudio-is/prisma-client";
import { loginPath } from "~/shared/router-utils";

export { links } from "~/dashboard2";

type User = Omit<DbUser, "createdAt"> & {
  createdAt: string;
};

type Data = {
  user: User;
};

export const loader = async ({ request }: LoaderArgs) => {
  const user = await findAuthenticatedUser(request);
  if (!user) {
    const url = new URL(request.url);
    return redirect(
      loginPath({
        returnTo: url.pathname,
      })
    );
  }
  return json({ user });
};

const DashboardRoute = () => {
  const { user } = useLoaderData<Data>();
  return <Dashboard user={user} />;
};

export default DashboardRoute;
