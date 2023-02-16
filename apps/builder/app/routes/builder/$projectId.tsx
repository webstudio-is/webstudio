import { useLoaderData } from "@remix-run/react";
import type { ShouldRevalidateFunction } from "@remix-run/react";
import type { ErrorBoundaryComponent, LoaderArgs } from "@remix-run/node";
import { loadBuildByProjectId } from "@webstudio-is/project-build/server";
import { db } from "@webstudio-is/project/server";
import { authorizeProject } from "@webstudio-is/trpc-interface/server";
import { createContext, createAuthReadToken } from "~/shared/context.server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { getBuildOrigin } from "~/shared/router-utils";
import { type BuilderProps, Builder, links } from "~/builder";

export { links };

export const loader = async ({
  params,
  request,
}: LoaderArgs): Promise<BuilderProps> => {
  if (params.projectId === undefined) {
    throw new Error("Project id undefined");
  }

  const context = await createContext(request);

  const url = new URL(request.url);
  const pageIdParam = url.searchParams.get("pageId");

  const project = await db.project.loadById(params.projectId, context);

  const authPermit =
    (await authorizeProject.getProjectPermit(
      {
        projectId: project.id,
        // At this point we already knew that if project loaded we have at least "view" permit
        // having that getProjectPermit is heavy operation we can skip check "view" permit
        permits: ["own", "build"] as const,
      },
      context
    )) ?? "view";

  if (project === null) {
    throw new Error(`Project "${params.projectId}" not found`);
  }

  const devBuild = await loadBuildByProjectId(project.id, "dev");

  const pages = devBuild.pages;
  const page =
    pages.pages.find((page) => page.id === pageIdParam) ?? pages.homePage;

  const authReadToken = await createAuthReadToken({ projectId: project.id });
  const authToken = url.searchParams.get("authToken") ?? undefined;

  return {
    project,
    pages,
    pageId: pageIdParam || devBuild.pages.homePage.id,
    treeId: page.treeId,
    buildId: devBuild.id,
    buildOrigin: getBuildOrigin(request),
    authReadToken,
    authToken,
    authPermit,
  };
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

export const BuilderRoute = () => {
  const data = useLoaderData<BuilderProps>();

  return <Builder {...data} />;
};

/**
 * We do not want trpc and other mutations that use the Remix useFetcher hook
 * to cause a reload of all builder data.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  return currentUrl.href === nextUrl.href ? false : defaultShouldRevalidate;
};

export default BuilderRoute;
