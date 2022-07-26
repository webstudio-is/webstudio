import { useActionData, useLoaderData } from "@remix-run/react";
import { ActionFunction, LoaderFunction } from "@remix-run/node";
import type { Project, Asset } from "@webstudio-is/prisma-client";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env from "~/env.server";
import { uploadAssets } from "~/shared/db/misc.server";
import { ErrorMessage } from "~/shared/error";
// if this file does not end in .server remix will not build
// since it only allows node code in those files
import {
  deleteAsset,
  loadByProject,
} from "@webstudio-is/asset-uploader/index.server";

export { links };

export const loader: LoaderFunction = async ({ params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadById(params.id);
  const assets = await loadByProject(params.id);
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
  if (request.method === "DELETE") {
    const formData = await request.formData();
    if (formData.get("assetId")) {
      const id = formData.get("assetId") as string;
      const deletedAsset = await deleteAsset(id);

      return { deletedAsset };
    }

    return {};
  }
  if (request.method === "POST") {
    try {
      const assets = await uploadAssets({
        request,
        projectId: params.id,
        dirname: __dirname,
      });
      return {
        uploadedAssets: assets.map((asset: Asset) => ({
          ...asset,
          status: "uploaded",
        })),
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
  const actionData = useActionData();
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }
  if (actionData && "errors" in actionData) {
    return <ErrorMessage message={actionData.errors} />;
  }
  return <Designer {...data} />;
};

export default DesignerRoute;
