import { type LoaderFunction } from "remix";
import type { Tree } from "~/shared/db";
import * as db from "~/shared/db";

export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Tree | ErrorData> => {
  if (params.projectId === undefined) throw new Error("Project ID undefined");
  try {
    const project = await db.project.loadOne(params.projectId);
    if (project === null) {
      return {
        errors: `Project "${params.projectId}" doesn't exist`,
      };
    }
    if (project.prodTreeId === null) {
      return {
        errors: "Site needs to be published, production tree ID is null.",
      };
    }
    return await db.tree.load(project.prodTreeId);
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "This is an impossible state." };
};
