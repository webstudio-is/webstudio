import { type LoaderFunction } from "@remix-run/node";
import { type InstanceProps } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project";
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

    const prodBuild = await db.build.loadProdByProjectId(params.projectId);

    if (prodBuild === undefined) {
      throw new Error(
        `Project ${params.projectId} needs to be published first`
      );
    }
    return await db.props.loadByTreeId(prodBuild.pages.homePage.treeId);
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
