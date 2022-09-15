import { useLoaderData } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";
import { Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/index.server";
import type { Project } from "@webstudio-is/project";
import config from "~/config";
import env from "~/env.server";
import { ErrorMessage } from "~/shared/error";
import { action, useAction } from "./_assets";

export { action, links };

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

export const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  useAction();
  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }

  return <Designer {...data} />;
};

export default DesignerRoute;
