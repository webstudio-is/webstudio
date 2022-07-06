import { useLoaderData } from "@remix-run/react";
import {
  redirect,
  type LoaderFunction,
  type ActionFunction,
  json,
} from "@remix-run/node";
import { Dashboard, links } from "apps/designer/app/dashboard";
import * as db from "apps/designer/app/shared/db";
import config from "apps/designer/app/config";
import { ensureUserCookie } from "apps/designer/app/shared/session";
import { authenticator } from "apps/designer/app/services/auth.server";
export { links };

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("project");
  if (typeof title !== "string") return { errors: "Title required" };
  const { userId, headers } = await ensureUserCookie(request);
  const authenticatedUser = await authenticator.isAuthenticated(request);
  try {
    const project = await db.project.create({
      title,
      userId: authenticatedUser?.id || userId,
    });
    return redirect(`${config.designerPath}/${project?.id}`, { headers });
  } catch (error) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    return redirect(config.loginPath);
  }
  const { headers } = await ensureUserCookie(request);
  const projects = await db.project.loadManyByUserId(user.id);
  return json({ config, projects, user }, headers);
};

const DashboardRoute = () => {
  const { config, projects, user } = useLoaderData();
  return <Dashboard config={config} user={user} projects={projects} />;
};

export default DashboardRoute;
