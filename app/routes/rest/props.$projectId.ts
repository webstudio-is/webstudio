import { type LoaderFunction } from "remix";
import { type InstanceProps } from "@webstudio-is/sdk";
import * as db from "~/shared/db";

type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Array<InstanceProps> | ErrorData> => {
  try {
    const project = await db.project.loadById(params.projectId);
    return await db.props.loadByProject(project, "production");
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
