import { type LoaderFunction } from "remix";
import type { Breakpoint } from "@webstudio-is/sdk";
import * as db from "~/shared/db";

export type ErrorData = {
  errors: string;
};

export const loader: LoaderFunction = async ({
  params,
}): Promise<Array<Breakpoint> | ErrorData> => {
  try {
    const data = await db.breakpoints.load(params.projectId);
    return data?.values || [];
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
