import {
  useLoaderData,
  redirect,
  type LoaderFunction,
  type ActionFunction,
} from "remix";
import { Dashboard, links } from "~/dashboard";
import * as db from "~/shared/db";
import config from "~/config";

export { links };

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("project") as string | null;
  const data = {} as { errors?: string };
  try {
    const project = await db.project.create({ title });
    return redirect(`${config.designerPath}/${project.id}`);
  } catch (error) {
    if (error instanceof Error) {
      data.errors = error.message;
    }
  }
  return data;
};

export const loader: LoaderFunction = async (request) => {
  const projects = await db.project.loadAll();
  return { config, projects };
};

export default () => {
  const { config, projects } = useLoaderData();
  return <Dashboard config={config} projects={projects} />;
};
