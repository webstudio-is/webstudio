import { type LoaderFunction } from "@remix-run/node";
import type { Tree } from "@webstudio-is/react-sdk";
import * as projectdomain from "@webstudio-is/project";
export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Tree | null | ErrorData> => {
  try {
    const project = await projectdomain.project.loadById(params.projectId);
    return await projectdomain.tree.loadByProject(project, "production");
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
