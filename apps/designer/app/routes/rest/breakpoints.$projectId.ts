import type { LoaderFunction } from "@remix-run/node";
import { Breakpoint } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project/index.server";

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
    const data = await db.breakpoints.load(prodBuild.id);
    if (data === null) {
      throw new Error(
        `Breakpoints not found for project ${params.projectId} and build ID ${prodBuild.id}`
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
