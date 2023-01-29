import { useLoaderData } from "@remix-run/react";
import type { ErrorBoundaryComponent, LoaderArgs } from "@remix-run/node";
import { type DesignerProps, Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { getBuildOrigin } from "~/shared/router-utils";
import { createContext, createAuthReadToken } from "~/shared/context.server";
import { trpcClient } from "~/services/trpc.server";

export { links };

export const loader = async ({
  params,
  request,
}: LoaderArgs): Promise<DesignerProps> => {
  if (params.projectId === undefined) {
    throw new Error("Project id undefined");
  }

  const context = await createContext(request);

  const url = new URL(request.url);
  const pageIdParam = url.searchParams.get("pageId");

  const project = await db.project.loadById(params.projectId, context);

  if (project === null) {
    throw new Error(`Project "${params.projectId}" not found`);
  }

  const devBuild = await db.build.loadByProjectId(project.id, "dev");

  const pages = devBuild.pages;
  const page =
    pages.pages.find((page) => page.id === pageIdParam) ?? pages.homePage;

  const authReadToken = await createAuthReadToken({ projectId: project.id });

  const projectSubjectSets = await trpcClient.authorize.expandLeafNodes.query({
    id: project.id,
    namespace: "Project",
  });

  const authSharedTokens: DesignerProps["authSharedTokens"] = [];

  for (const subjectSet of projectSubjectSets) {
    if (subjectSet.namespace === "Token") {
      authSharedTokens.push({
        token: subjectSet.id,
        relation: subjectSet.relation,
      });
    }
  }

  return {
    project,
    pages,
    pageId: pageIdParam || devBuild.pages.homePage.id,
    treeId: page.treeId,
    buildId: devBuild.id,
    buildOrigin: getBuildOrigin(request),
    authReadToken,
    authSharedTokens,
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
