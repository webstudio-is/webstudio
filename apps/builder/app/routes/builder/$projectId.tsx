import { useLoaderData, useRouteError } from "@remix-run/react";
import type { ShouldRevalidateFunction } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { loadBuildByProjectId } from "@webstudio-is/project-build/server";
import { db } from "@webstudio-is/project/server";
import { authorizeProject } from "@webstudio-is/trpc-interface/server";
import { createContext } from "~/shared/context.server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { getBuildOrigin } from "~/shared/router-utils";
import { type BuilderProps, Builder, links } from "~/builder";
import { loadByProject } from "@webstudio-is/asset-uploader/server";

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

  const start = Date.now();
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
  const assets = await loadByProject(project.id, context);

  const end = Date.now();

  const diff = end - start;

  // we need to log timings to figure out how to speed up loading
  // eslint-disable-next-line no-console
  console.log(`Project ${project.id} is loaded in ${diff}ms`);

  const authToken = url.searchParams.get("authToken") ?? undefined;

  return {
    project,
    build: devBuild,
    assets: assets.map((asset) => [asset.id, asset]),
    buildOrigin: getBuildOrigin(request),
    authToken,
    authPermit,
  };
};

export const ErrorBoundary = () => {
  const error = useRouteError();
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
  const currentUrlCopy = new URL(currentUrl);
  const nextUrlCopy = new URL(nextUrl);
  // prevent revalidating data when pageId changes
  // to not regenerate auth token and preserve canvas url
  currentUrlCopy.searchParams.delete("pageId");
  nextUrlCopy.searchParams.delete("pageId");
  return currentUrlCopy.href === nextUrlCopy.href
    ? false
    : defaultShouldRevalidate;
};

export default BuilderRoute;
