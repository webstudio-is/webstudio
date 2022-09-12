import { useLoaderData } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env, { type Env } from "~/env.server";
import { ErrorMessage } from "~/shared/error";
import { action, useAction } from "./_assets";

export { links, action };

export const loader: LoaderFunction = async ({
  params,
}): Promise<Data | Error> => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadById(params.id);

  if (project === null) {
    return { errors: `Project "${params.id}" not found` };
  }
  return { config, project, env };
};

type Data = {
  config: typeof config;
  project: db.project.Project;
  env: Env;
};

type Error = {
  errors: string;
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
