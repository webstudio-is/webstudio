import { useLoaderData } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";
import type { Project } from "@webstudio-is/react-sdk";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env from "~/env.server";
export { links };

export const loader: LoaderFunction = async ({ params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadById(params.id);
  if (project === null) {
    return { errors: `Project "${params.id}" not found` };
  }
  return { config, project, env };
};

type Data = {
  config: typeof config;
  project: Project;
};

type Error = {
  errors: "string";
};

const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Designer {...data} />;
};

export default DesignerRoute;
