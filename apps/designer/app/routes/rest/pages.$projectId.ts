import { LoaderFunction, ActionFunction } from "@remix-run/node";
import { db } from "@webstudio-is/project/server";
import { type Pages, utils } from "@webstudio-is/project";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { sentryException } from "~/shared/sentry";
import type {
  CreatePageData,
  DeletePageData,
  EditPageData,
} from "~/shared/pages";
import { type FetcherData, makeFieldError } from "~/shared/form-utils";

const nonEmptyString = z
  .string({
    invalid_type_error: "Can't be empty",
    required_error: "Can't be empty",
  })
  .transform((value) => value.trim())
  .refine((value) => value !== "", "Can't be empty");

const commonPageInput = {
  name: nonEmptyString,
  path: nonEmptyString
    .refine((path) => path !== "/", "Can't be just a /")
    .transform((path) => (path.endsWith("/") ? path.slice(0, -1) : path))
    .transform((path) => path.replace(/\/\//g, "/"))
    .refine(
      (path) => path === "" || path.startsWith("/"),
      "Must start with a /"
    )
    .refine(
      (path) => /^[-_a-z0-9\\/]*$/.test(path),
      "Only a-z, 0-9, -, _ and / are allowed"
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

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  const existingPage = utils.pages.findByPath(devBuild.pages, data.path);
  if (existingPage !== undefined) {
    return makeFieldError("path", `Already used for "${existingPage.name}"`);
  }

  const updatedBuild = await db.build.addPage(devBuild.id, data);

  const newPage = utils.pages.findByPath(updatedBuild.pages, data.path);

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

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  if (data.path !== undefined) {
    const existingPage = utils.pages.findByPath(devBuild.pages, data.path);
    if (existingPage !== undefined && existingPage.id !== id) {
      return makeFieldError("path", `Already used for "${existingPage.name}"`);
    }
  }

  await db.build.editPage(devBuild.id, id, data);

  return { status: "ok" };
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

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  if (devBuild.pages.homePage.id === id) {
    return makeFieldError("id", `Can't delete the home page`);
  }

  await db.build.deletePage(devBuild.id, id);

  return { status: "ok" };
};

export const action: ActionFunction = async ({
  request,
  params,
}): Promise<FetcherData<unknown>> => {
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

export const loader: LoaderFunction = async ({
  params,
}): Promise<Pages | ErrorData> => {
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

    return prodBuild.pages;
  } catch (error) {
    sentryException({ error });
    return {
      errors: error instanceof Error ? error.message : String(error),
    };
  }
};
