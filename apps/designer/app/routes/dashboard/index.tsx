import { useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Dashboard, links } from "~/dashboard";
import { db } from "@webstudio-is/project/server";
import { ensureUserCookie } from "~/shared/session";
import { findAuthenticatedUser } from "~/services/auth.server";
import { zfd } from "zod-form-data";
import { type Project, User as DbUser } from "@webstudio-is/prisma-client";
import { designerPath, loginPath } from "~/shared/router-utils";

type User = Omit<DbUser, "createdAt"> & {
  createdAt: string;
};

export { links };
const schema = zfd.formData({
  project: zfd.text(),
});

type Data = {
  projects: Array<Project>;
  user: User;
};

export const action = async ({ request }: ActionArgs) => {
  const { project: title } = schema.parse(await request.formData());

  const { userId, headers } = await ensureUserCookie(request);
  const authenticatedUser = await findAuthenticatedUser(request);
  try {
    const project = await db.project.create({
      title,
      userId: authenticatedUser?.id || userId,
    });
    return redirect(designerPath({ projectId: project.id }), { headers });
  } catch (error) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};

export const loader = async ({ request }: LoaderArgs) => {
  const user = await findAuthenticatedUser(request);
  if (!user) {
    return redirect(loginPath({}));
  }
  const { headers } = await ensureUserCookie(request);
  const projects = await db.project.loadManyByUserId(user.id);
  return json({ projects, user }, headers);
};

const DashboardRoute = () => {
  const { projects, user } = useLoaderData<Data>();

  return <Dashboard user={user} projects={projects} />;
};

export default DashboardRoute;
