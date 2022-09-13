import { type LoaderFunction } from "@remix-run/node";
import type { Tree } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project";
export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Tree | null | ErrorData> => {
  try {
    const project = await db.project.loadById(params.projectId);
    return await db.tree.loadByProject(project, "production");
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
