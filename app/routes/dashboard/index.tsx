import {
  useLoaderData,
  redirect,
  type LoaderFunction,
  type ActionFunction,
  json,
} from "remix";
import { Dashboard, links } from "~/dashboard";
import * as db from "~/shared/db";
import config from "~/config";
import { ensureUserCookie } from "~/shared/session";

export { links };

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("project");
  if (typeof title !== "string") return { errors: "Title required" };
  const { userId, headers } = await ensureUserCookie(request);
  try {
    const project = await db.project.create({ title, userId });
    return redirect(`${config.designerPath}/${project.id}`, { headers });
  } catch (error) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};

export const loader: LoaderFunction = async ({ request }) => {
  const { userId, headers } = await ensureUserCookie(request);
  const projects = await db.project.loadManyByUserId(userId);
  return json({ config, projects }, headers);
};

const DashboardRoute = () => {
  const { config, projects } = useLoaderData();
  return <Dashboard config={config} projects={projects} />;
};

export default DashboardRoute;
