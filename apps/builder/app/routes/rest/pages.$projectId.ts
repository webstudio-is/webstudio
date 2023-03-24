import { zfd } from "zod-form-data";
import { z } from "zod";
import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import type { Pages } from "@webstudio-is/project-build";
import {
  deletePage,
  loadBuildByProjectId,
} from "@webstudio-is/project-build/server";
import { sentryException } from "~/shared/sentry";
import type { DeletePageData } from "~/shared/pages";
import { type FetcherData, makeFieldError } from "~/shared/form-utils";

const DeletePageInput = zfd.formData({ id: z.string() });

const handleDelete = async (
  projectId: string,
  request: Request
): Promise<DeletePageData> => {
  const result = DeletePageInput.safeParse(await request.formData());
  if (result.success === false) {
    return { status: "error", errors: result.error.formErrors };
  }
  const { id } = result.data;

  const devBuild = await loadBuildByProjectId(projectId, "dev");

  if (devBuild.pages.homePage.id === id) {
    return makeFieldError("id", `Can't delete the home page`);
  }

  await deletePage({
    projectId,
    buildId: devBuild.id,
    pageId: id,
  });

  return { status: "ok" };
};

export const action = async ({
  request,
  params,
}: ActionArgs): Promise<FetcherData<unknown>> => {
  try {
    if (params.projectId === undefined) {
      throw new Error(`Project ID required`);
    }

    if (request.method === "DELETE") {
      return await handleDelete(params.projectId, request);
    }

    throw new Error(`Method ${request.method} is not supported`);
  } catch (error) {
    sentryException({ error });
    return {
      status: "error",
      errors: error instanceof Error ? error.message : String(error),
    };
  }
};

export type ErrorData = {
  errors: string;
};

export const loader = async ({
  params,
}: LoaderArgs): Promise<Pages | ErrorData> => {
  try {
    if (params.projectId === undefined) {
      throw new Error(`Project ID required`);
    }

    const prodBuild = await loadBuildByProjectId(params.projectId, "prod");

    if (prodBuild === undefined) {
      throw new Error(
        `Project ${params.projectId} needs to be published first`
      );
    }

    return prodBuild.pages;
  } catch (error) {
    sentryException({ error });
    return {
      errors: error instanceof Error ? error.message : String(error),
    };
  }
};
