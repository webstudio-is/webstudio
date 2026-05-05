import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import type { Asset } from "@webstudio-is/sdk";
import {
  loadAssetsByProject,
  createUploadName,
} from "@webstudio-is/asset-uploader/index.server";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { parseError } from "~/shared/error/error-parse";

export const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<Array<Asset>> => {
  if (params.projectId === undefined) {
    throw new Error("Project id undefined");
  }
  const context = await createContext(request);
  return await loadAssetsByProject(params.projectId, context);
};

export const action = async (props: ActionFunctionArgs) => {
  try {
    preventCrossOriginCookie(props.request);
    await checkCsrf(props.request);

    const { request } = props;

    const context = await createContext(request);

    if (request.method === "POST") {
      const formData = await request.formData();
      const assetId = formData.get("assetId");
      const projectId = formData.get("projectId");
      const type = formData.get("type");
      const filename = formData.get("filename");
      if (
        typeof assetId !== "string" ||
        typeof projectId !== "string" ||
        typeof type !== "string" ||
        typeof filename !== "string"
      ) {
        throw Error("Project id, asset id or filename are missing");
      }
      const name = await createUploadName(
        {
          assetId,
          projectId,
          type,
          filename,
          maxAssetsPerProject: context.planFeatures.maxAssetsPerProject,
        },
        context
      );
      return {
        name,
      };
    }
  } catch (error) {
    console.error(error);

    return {
      errors: parseError(error).message,
    };
  }
};
