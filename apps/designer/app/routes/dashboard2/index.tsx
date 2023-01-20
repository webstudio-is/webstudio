import { useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Dashboard } from "~/dashboard2";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { db } from "@webstudio-is/project/server";
import { ComponentProps } from "react";

export { links } from "~/dashboard2";

type Data = ComponentProps<typeof Dashboard>;

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
  const projects = await db.project.loadManyByUserId(user.id);
  return json({ user, projects });
};

const DashboardRoute = () => {
  const data = useLoaderData<Data>();
  return <Dashboard {...data} />;
};

export default DashboardRoute;
