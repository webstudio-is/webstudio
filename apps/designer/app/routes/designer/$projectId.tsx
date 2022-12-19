import { useLoaderData } from "@remix-run/react";
import type { ErrorBoundaryComponent, LoaderFunction } from "@remix-run/node";
import { type DesignerProps, Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { getBuildOrigin } from "~/shared/router-utils";

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
  const pageId = pageIdParam || devBuild.pages.homePage.id;
  const page = [devBuild.pages.homePage, ...devBuild.pages.pages].find(
    (page) => page.id === pageId
  );
  const treeId = page?.treeId;
  const treeProps =
    treeId === undefined ? [] : await db.props.loadByTreeId(treeId);

  if (treeId === undefined) {
    throw Error("Tree not found");
  }

  return {
    project,
    pages: devBuild.pages,
    buildId: devBuild.id,
    pageId,
    treeId,
    treeProps,
    buildOrigin: getBuildOrigin(request),
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
