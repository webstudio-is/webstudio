import { useLoaderData } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";
import { type DesignerProps, Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/index.server";
import config from "~/config";
import { ErrorMessage } from "~/shared/error";
import { action, useAction } from "./_assets";
import { sentryException } from "~/shared/sentry";
import { getUserContentBaseUrl } from "~/shared/router-utils";

export { action, links };

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<DesignerProps | Error> => {
  try {
    if (params.projectId === undefined) {
      throw new Error("Project id undefined");
    }

    const url = new URL(request.url);
    const pageIdParam = url.searchParams.get("pageId");

    const project = await db.project.loadById(params.projectId);

    if (project === null) {
      throw new Error(`Project "${params.projectId}" not found`);
    }

    const devBuild = await db.build.loadByProjectId(project.id, "dev");

    return {
      config,
      project,
      pages: devBuild.pages,
      pageId: pageIdParam || devBuild.pages.homePage.id,
      userContentBaseUrl: getUserContentBaseUrl(request),
    };
  } catch (error) {
    sentryException({ error });
    return { errors: error instanceof Error ? error.message : String(error) };
  }
};

type Error = {
  errors: string;
};

export const DesignerRoute = () => {
  const data = useLoaderData<DesignerProps | Error>();
  useAction();

  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }

  return <Designer {...data} />;
};

export default DesignerRoute;
