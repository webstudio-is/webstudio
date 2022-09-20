import { type LoaderFunction } from "@remix-run/node";
import { type InstanceProps } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project/index.server";
import { utils } from "@webstudio-is/project";

type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Array<InstanceProps> | ErrorData> => {
  try {
    if (params.projectId === undefined) {
      throw new Error(`Project ID required`);
    }
    if (params.pageId === undefined) {
      throw new Error(`Page ID required`);
    }

    const prodBuild = await db.build.loadByProjectId(params.projectId, "prod");

    if (prodBuild === undefined) {
      throw new Error(
        `Project ${params.projectId} needs to be published first`
      );
    }

    const page = utils.pages.findById(prodBuild.pages, params.pageId);

    if (page === undefined) {
      throw new Error(`Page ${params.pageId} not found`);
    }

    return await db.props.loadByTreeId(page.treeId);
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
