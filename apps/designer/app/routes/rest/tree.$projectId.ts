import { type LoaderFunction } from "@remix-run/node";
import type { Tree } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project/index.server";
import { utils } from "@webstudio-is/project";

export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Tree | null | ErrorData> => {
  try {
    if (params.projectId === undefined) {
      throw new Error(`Project ID required`);
    }

    const prodBuild = await db.build.loadByProjectId(params.projectId, "prod");

    if (prodBuild === undefined) {
      throw new Error(
        `Project ${params.projectId} needs to be published first`
      );
    }

    const page =
      params.pageId === undefined
        ? prodBuild.pages.homePage
        : utils.pages.findById(prodBuild.pages, params.pageId);

    if (page === undefined) {
      throw new Error(`Page ${params.pageId} not found`);
    }

    return await db.tree.loadById(page.treeId);
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
