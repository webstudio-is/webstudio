import { useLoaderData } from "@remix-run/react";
import type { ErrorBoundaryComponent, LoaderFunction } from "@remix-run/node";
import { type DesignerProps, Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { getBuildOrigin } from "~/shared/router-utils";
import { loadByProject } from "@webstudio-is/asset-uploader/server";

export { links };

export const loader: LoaderFunction = async ({
  params,
  request,
}): Promise<DesignerProps> => {
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
  const assets = await loadByProject(project.id);

  return {
    project,
    pages: devBuild.pages,
    pageId: pageIdParam || devBuild.pages.homePage.id,
    buildOrigin: getBuildOrigin(request),
    assets,
  };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

export const DesignerRoute = () => {
  const data = useLoaderData<DesignerProps>();

  return <Designer {...data} />;
};

export default DesignerRoute;
