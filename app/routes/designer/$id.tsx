import { useLoaderData, type LoaderFunction } from "remix";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";

export { links };

export const loader: LoaderFunction = async ({ params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadOne(params.id);
  return { config, project };
};

type Data = {
  config: typeof config;
  project: db.Project;
};

export default () => {
  const { config, project } = useLoaderData<Data>();
  return <Designer config={config} project={project} />;
};
