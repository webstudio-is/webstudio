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
    const project = await db.project.loadById(params.projectId);
    if (project === null) {
      throw new Error(`Project ${params.projectId} not found`);
    }
    if (project.prodTreeId === null) {
      throw new Error(
        `Project ${params.projectId} needs to be published first`
      );
    }
    const data = await db.breakpoints.load(project.prodTreeId);
    if (data === null) {
      throw new Error(
        `Breakpoints not found for project ${params.projectId} and tree ID ${project.prodTreeId}`
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
