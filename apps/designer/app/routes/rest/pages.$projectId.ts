import type { LoaderFunction } from "@remix-run/node";
import type { Breakpoint } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project";

export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Array<Breakpoint> | ErrorData> => {
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
    const data = await db.breakpoints.load(prodBuild.pages.homePage.treeId);
    if (data === null) {
      throw new Error(
        `Breakpoints not found for project ${params.projectId} and tree ID ${prodBuild.pages.homePage.treeId}`
      );
    }
    return data.values;
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
