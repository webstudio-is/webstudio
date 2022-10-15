import { LoaderFunction, ActionFunction } from "@remix-run/node";
import { db } from "@webstudio-is/project/index.server";
import { type Pages, utils } from "@webstudio-is/project";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { PutPageData } from "~/designer/features/sidebar-left/panels/pages/settings";
import { sentryException } from "~/shared/sentry";

const nonEmptyString = (fieldName: string) => {
  const message = `${fieldName} can't be empty`;
  return z
    .string({ invalid_type_error: message, required_error: message })
    .transform((v) => v.trim())
    .refine((val) => val !== "", message);
};

const CreatePageInput = zfd.formData({
  name: nonEmptyString("Page Name"),
  path: nonEmptyString("Path")
    .refine((path) => path !== "/", "Path can't be /")
    .transform((path) => (path.endsWith("/") ? path.slice(0, -1) : path))
    .transform((path) => path.replace(/\/\//g, "/"))
    .refine((path) => path.startsWith("/"), "Path must start with a /"),
});

const handlePUT = async (
  projectId: string,
  request: Request
): Promise<PutPageData> => {
  const result = CreatePageInput.safeParse(await request.formData());
  if (result.success === false) {
    return { errors: result.error.formErrors };
  }
  const data = result.data;

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  const existingPage = utils.pages.findByPath(devBuild.pages, data.path);
  if (existingPage !== undefined) {
    return {
      errors: {
        formErrors: [],
        fieldErrors: {
          path: [
            `The path ${data.path} is already used for another page "${existingPage.name}"`,
          ],
        },
      },
    };
  }

  const updatedBuild = await db.build.addPage(devBuild.id, data);

  const newPage = utils.pages.findByPath(updatedBuild.pages, data.path);

  if (newPage === undefined) {
    throw new Error("New page not found");
  }

  return { ok: true, page: newPage };
};

export const action: ActionFunction = async ({ request, params }) => {
  try {
    if (params.projectId === undefined) {
      throw new Error(`Project ID required`);
    }

    if (request.method.toLowerCase() === "put") {
      return handlePUT(params.projectId, request);
    }

    throw new Error(`Method ${request.method} is not supported`);
  } catch (error) {
    sentryException({ error });
    return {
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
