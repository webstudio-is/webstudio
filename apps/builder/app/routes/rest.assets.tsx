import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import type { Asset } from "@webstudio-is/sdk";
import { MaxAssets } from "@webstudio-is/asset-uploader";
import {
  loadAssetsByProject,
  createUploadName,
} from "@webstudio-is/asset-uploader/index.server";
import { sentryException } from "~/shared/sentry";
import { createContext } from "~/shared/context.server";
import env from "~/env/env.server";

export const loader = async ({
  params,
  request,
}: LoaderArgs): Promise<Array<Asset>> => {
  if (params.projectId === undefined) {
    throw new Error("Project id undefined");
  }
  const context = await createContext(request);
  return await loadAssetsByProject(params.projectId, context);
};

export const action = async (props: ActionArgs) => {
  const { request } = props;

  const context = await createContext(request);

  try {
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
    if (error instanceof Error) {
      sentryException({ error });
      return {
        errors: error.message,
      };
    }
  }
};
