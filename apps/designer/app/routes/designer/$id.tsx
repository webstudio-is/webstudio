import { useActionData, useLoaderData } from "@remix-run/react";
import { ActionFunction, LoaderFunction } from "@remix-run/node";
import type { Asset } from "@webstudio-is/prisma-client";
import { toast } from "@webstudio-is/design-system";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env, { type Env } from "~/env.server";
import { uploadAssets } from "~/shared/db/misc.server";
import { ErrorMessage } from "~/shared/error";
// if this file does not end in .server remix will not build
// since it only allows node code in those files
import { deleteAsset } from "@webstudio-is/asset-uploader/index.server";
import { zfd } from "zod-form-data";
import { useEffect } from "react";

export { links };

type Data = {
  config: typeof config;
  project: db.project.Project;
  env: Env;
};

type Error = {
  errors: string;
};

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

const deleteAssetSchema = zfd.formData({
  assetId: zfd.text(),
  assetName: zfd.text(),
});

export const action: ActionFunction = async ({ request, params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  try {
    if (request.method === "DELETE") {
      const { assetId, assetName } = deleteAssetSchema.parse(
        await request.formData()
      );
      const deletedAsset = await deleteAsset({
        id: assetId,
        name: assetName,
      });

      return { deletedAsset };
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  if (request.method === "POST") {
    try {
      const assets = await uploadAssets({
        request,
        projectId: params.id,
      });
      return {
        uploadedAssets: assets.map((asset) => ({
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

  useEffect(() => {
    if (actionData && "errors" in actionData) {
      toast.error(actionData.errors);
    }
  }, [actionData]);

  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }

  return <Designer {...data} />;
};

export default DesignerRoute;
