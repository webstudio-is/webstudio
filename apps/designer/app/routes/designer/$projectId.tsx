import { useLoaderData } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";
import { Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/index.server";
import { type Project, type Page, utils } from "@webstudio-is/project";
import config from "~/config";
import { ErrorMessage } from "~/shared/error";
import { action, useAction } from "./_assets";
import { sentryException } from "~/shared/sentry";

export { action, links };

export const loader: LoaderFunction = async ({
  params,
}): Promise<Data | Error> => {
  try {
    if (params.projectId === undefined) {
      throw new Error("Project id undefined");
    }

    const project = await db.project.loadById(params.projectId);

    if (project === null) {
      throw new Error(`Project "${params.projectId}" not found`);
    }

    const devBuild = await db.build.loadByProjectId(project.id, "dev");

    const page =
      params.pageId === undefined
        ? devBuild.pages.homePage
        : utils.pages.findById(devBuild.pages, params.pageId);

    if (page === undefined) {
      throw new Error(`Page "${params.pageId}" not found`);
    }

    return { config, project, page };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sentryException({ message });
    return { errors: message };
  }
};

type Data = {
  config: typeof config;
  project: Project;
  page: Page;
};

type Error = {
  errors: string;
};

export const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  useAction();
  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }

  return <Designer {...data} />;
};

export default DesignerRoute;
