import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import type { Asset } from "@webstudio-is/sdk";
import { MaxAssets } from "@webstudio-is/asset-uploader";
import {
  loadAssetsByProject,
  createUploadName,
} from "@webstudio-is/asset-uploader/index.server";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";
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
      const projectId = formData.get("projectId") as string;
      const type = formData.get("type") as string;
      const filename = formData.get("filename") as string;
      if (projectId === null || type === null || filename === null) {
        throw Error("Project id, asset id or filename are missing");
      }
      const name = await createUploadName(
        {
          projectId,
          type,
          filename,
          maxAssetsPerProject: MaxAssets.parse(env.MAX_ASSETS_PER_PROJECT),
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
