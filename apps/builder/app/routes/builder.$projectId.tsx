import { lazy } from "react";
import {
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import type { ShouldRevalidateFunction } from "@remix-run/react";
import {
  type LoaderFunctionArgs,
  redirect,
  json,
} from "@remix-run/server-runtime";

import { loadBuildByProjectId } from "@webstudio-is/project-build/index.server";
import { db } from "@webstudio-is/project/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";

import {
  AuthorizationError,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { createContext } from "~/shared/context.server";
import { ErrorMessage } from "~/shared/error";
import { loginPath } from "~/shared/router-utils";
import type { BuilderProps } from "~/builder/index.client";
import env from "~/env/env.server";
import { staticEnv } from "~/env/env.static.server";

import builderStyles from "~/builder/builder.css?url";
import prismStyles from "prismjs/themes/prism-solarizedlight.min.css?url";
import { ClientOnly } from "~/shared/client-only";

// Can cause FOUC because of remix-island, be very accurate adding anything here
export const links = () => {
  return [
    { rel: "stylesheet", href: builderStyles },
    { rel: "stylesheet", href: prismStyles },
  ];
};

export const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<BuilderProps> => {
  // TODO: remove after release 17 apr 2024
  console.info({ staticEnv });

  const context = await createContext(request);

  try {
    if (params.projectId === undefined) {
      throw new Error("Project id undefined");
    }

    const url = new URL(request.url);

    const start = Date.now();
    const project = await db.project.loadById(params.projectId, context);

    const authPermit =
      (await authorizeProject.getProjectPermit(
        {
          projectId: project.id,
          // At this point we already knew that if project loaded we have at least "view" permit
          // having that getProjectPermit is heavy operation we can skip check "view" permit
          permits: ["own", "admin", "build"] as const,
        },
        context
      )) ?? "view";

    if (project === null) {
      throw new Error(`Project "${params.projectId}" not found`);
    }

    const devBuild = await loadBuildByProjectId(project.id);

    const assets = await loadAssetsByProject(project.id, context);

    const end = Date.now();

    const diff = end - start;

    // we need to log timings to figure out how to speed up loading

    console.info(`Project ${project.id} is loaded in ${diff}ms`);

    const authToken = url.searchParams.get("authToken") ?? undefined;

    const authTokenPermissions =
      authPermit !== "own" && authToken !== undefined
        ? await authDb.getTokenPermissions(
            {
              projectId: project.id,
              token: authToken,
            },
            context
          )
        : authDb.tokenDefaultPermissions;

    const { userPlanFeatures } = context;
    if (userPlanFeatures === undefined) {
      throw new Error("User plan features are not defined");
    }

    if (project.userId === null) {
      throw new AuthorizationError("Project must have project userId defined");
    }

    const publisherHost = env.PUBLISHER_HOST;
    return {
      project,
      publisherHost,
      imageBaseUrl: env.IMAGE_BASE_URL,
      build: devBuild,
      assets: assets.map((asset) => [asset.id, asset]),
      authToken,
      authTokenPermissions,
      authPermit,
      userPlanFeatures,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      // try to login user if he is not logged in
      if (context.authorization.userId === undefined) {
        const url = new URL(request.url);

        throw redirect(
          loginPath({
            returnTo: url.pathname,
          })
        );
      }

      const FORBIDDEN = 403;

      throw json({ message: error.message }, { status: FORBIDDEN });
    }

    throw error;
  }
};

export const ErrorBoundary = () => {
  const error = useRouteError();
  console.error({ error });
  const message = isRouteErrorResponse(error)
    ? error.data.message ?? error.data
    : error instanceof Error
      ? error.message
      : String(error);

  return <ErrorMessage message={message} />;
};

const Builder = lazy(async () => {
  const { Builder } = await import("~/builder/index.client");
  return { default: Builder };
});

export const BuilderRoute = () => {
  const data = useLoaderData<BuilderProps>();

  return (
    <ClientOnly>
      <Builder {...data} />
    </ClientOnly>
  );
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

  currentUrlCopy.searchParams.delete("mode");
  nextUrlCopy.searchParams.delete("mode");

  currentUrlCopy.searchParams.delete("pageHash");
  nextUrlCopy.searchParams.delete("pageHash");

  return currentUrlCopy.href === nextUrlCopy.href
    ? false
    : defaultShouldRevalidate;
};

export default BuilderRoute;

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30,
};
