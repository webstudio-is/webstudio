import { zfd } from "zod-form-data";
import { z } from "zod";
import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import {
  type Pages,
  pathValidators,
  findPageByIdOrPath,
} from "@webstudio-is/project-build";
import {
  addPage,
  deletePage,
  editPage,
  loadBuildByProjectId,
} from "@webstudio-is/project-build/server";
import { sentryException } from "~/shared/sentry";
import type {
  CreatePageData,
  DeletePageData,
  EditPageData,
} from "~/shared/pages";
import { type FetcherData, makeFieldError } from "~/shared/form-utils";

const nonEmptyString = z
  .string({
    invalid_type_error: "Can't be empty", // eslint-disable-line camelcase
    required_error: "Can't be empty", // eslint-disable-line camelcase
  })
  .transform((value) => value.trim())
  .refine((value) => value !== "", "Can't be empty");

const commonPageInput = {
  name: nonEmptyString,
  path: pathValidators(
    nonEmptyString
      .transform((path) =>
        path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
      )
      .transform((path) => path.replace(/\/\//g, "/"))
  ),
  title: z.string().optional(),
  description: z.string().optional(),
} as const;

const CreatePageInput = zfd.formData(commonPageInput);

const handlePut = async (
  projectId: string,
  request: Request
): Promise<CreatePageData> => {
  const result = CreatePageInput.safeParse(await request.formData());
  if (result.success === false) {
    return { status: "error", errors: result.error.formErrors };
  }
  const { description, ...restData } = result.data;
  const data = {
    ...restData,
    meta: description !== undefined ? { description } : undefined,
  };

  const devBuild = await loadBuildByProjectId(projectId, "dev");

  const existingPage = findPageByIdOrPath(devBuild.pages, data.path);
  if (existingPage !== undefined) {
    return makeFieldError("path", `Already used for "${existingPage.name}"`);
  }

  const updatedBuild = await addPage({
    projectId,
    buildId: devBuild.id,
    data,
  });

  const newPage = findPageByIdOrPath(updatedBuild.pages, data.path);

  if (newPage === undefined) {
    throw new Error("New page not found");
  }

  return { status: "ok", page: newPage };
};

const EditPageInput = zfd.formData({
  id: z.string(),
  name: z.optional(commonPageInput.name),
  path: z.optional(commonPageInput.path),
  title: z.optional(commonPageInput.title),
  description: z.optional(commonPageInput.description),
});

const handlePost = async (
  projectId: string,
  request: Request
): Promise<EditPageData> => {
  const result = EditPageInput.safeParse(await request.formData());
  if (result.success === false) {
    return { status: "error", errors: result.error.formErrors };
  }
  const { id, description, ...restData } = result.data;
  const data = {
    ...restData,
    meta: description !== undefined ? { description } : undefined,
  };

  const devBuild = await loadBuildByProjectId(projectId, "dev");

  if (data.path !== undefined) {
    const existingPage = findPageByIdOrPath(devBuild.pages, data.path);
    if (existingPage !== undefined && existingPage.id !== id) {
      return makeFieldError("path", `Already used for "${existingPage.name}"`);
    }
  }

  const updatedBuild = await editPage({
    projectId,
    buildId: devBuild.id,
    pageId: id,
    data,
  });

  const updatedPage = findPageByIdOrPath(updatedBuild.pages, id);

  if (updatedPage === undefined) {
    throw new Error("Updated page not found");
  }

  return { status: "ok", page: updatedPage };
};

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

    if (request.method === "PUT") {
      return await handlePut(params.projectId, request);
    }

    if (request.method === "POST") {
      return await handlePost(params.projectId, request);
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
