import { useLoaderData } from "@remix-run/react";
import { ActionFunction, LoaderFunction } from "@remix-run/node";
import type { Project, Asset } from "@webstudio-is/react-sdk";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env from "~/env.server";
import { uploadAssets } from "~/shared/db/misc.server";

export { links };

export const loader: LoaderFunction = async ({ params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadById(params.id);
  const assets = await db.assets.loadByProject(params.id);
  if (project === null) {
    return { errors: `Project "${params.id}" not found` };
  }
  return { config, assets, project, env };
};

type Data = {
  config: typeof config;
  project: Project;
  assets: Asset[];
};

type Error = {
  errors: "string";
};

export const action: ActionFunction = async ({ request, params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  if (request.method === "POST") {
    try {
      const assets = await uploadAssets({
        request,
        projectId: params.id,
        db,
        dirname: __dirname,
      });
      return {
        assets,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          errors: error.message,
        };
      }
    }
  }
};

const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Designer {...data} />;
};

export default DesignerRoute;
