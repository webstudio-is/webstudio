/**
 * The file is named _ui.(builder) instead of _ui._index due to an issue with Vercel.
 * The _ui._index route isn’t recognized on Vercel, even though it works perfectly in other environments.
 */

import { lazy } from "react";
import { useLoaderData } from "@remix-run/react";
import type { MetaFunction, ShouldRevalidateFunction } from "@remix-run/react";
import {
  json,
  type HeadersArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";

import { loadBuildIdAndVersionByProjectId } from "@webstudio-is/project-build/index.server";
import { db } from "@webstudio-is/project/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";

import {
  AuthorizationError,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "~/shared/context.server";
import { dashboardPath, isBuilder, isDashboard } from "~/shared/router-utils";

import env from "~/env/env.server";

import builderStyles from "~/builder/builder.css?url";
import { ClientOnly } from "~/shared/client-only";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect } from "~/services/no-store-redirect";
import { builderSessionStorage } from "~/services/builder-session.server";
import {
  allowedDestinations,
  isFetchDestination,
} from "~/services/destinations.server";
import { loader as authWsLoader } from "./auth.ws";
export { ErrorBoundary } from "~/shared/error/error-boundary";

export const links = () => {
  return [{ rel: "stylesheet", href: builderStyles }];
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const metas: ReturnType<MetaFunction> = [];

  if (data === undefined) {
    return metas;
  }
  const { project } = data;

  if (project.title) {
    metas.push({ title: project.title });
  }

  return metas;
};

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
  const { request } = loaderArgs;
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);

  if (isDashboard(request)) {
    throw redirect(dashboardPath());
  }

  if (false === isBuilder(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  if (isFetchDestination(request)) {
    // Remix does not provide a built-in way to add CSRF tokens to data fetches,
    // such as client-side navigation or data refreshes.
    // Therefore, ensure that all data fetched here is not sensitive and does not require CSRF protection.
    // await checkCsrf(request);
  }

  const context = await createContext(request);

  if (context.authorization.type === "service") {
    throw new AuthorizationError("Service calls are not allowed");
  }

  if (context.authorization.type === "anonymous") {
    throw await authWsLoader(loaderArgs); // redirect("/auth/ws");
  }

  if (
    context.authorization.type === "user" &&
    request.headers.get("sec-fetch-mode") === "navigate"
  ) {
    // If logout fails, or the session cookie in the dashboard is deleted or expired,
    // enforce reauthorization on builder reload or navigation (sec-fetch-mode === 'navigate') after a timeout.
    const RELOAD_ON_NAVIGATE_TIMEOUT =
      env.DEPLOYMENT_ENVIRONMENT === "production"
        ? 1000 * 60 * 60 * 24 * 7 // 1 week
        : 1000 * 60 * 60 * 1; // 1 hour

    if (
      Date.now() - context.authorization.sessionCreatedAt >
      RELOAD_ON_NAVIGATE_TIMEOUT
    ) {
      throw await authWsLoader(loaderArgs); // start immediately instead of redirect("/auth/ws");
    }
  }

  try {
    const url = new URL(request.url);

    const { projectId } = parseBuilderUrl(request.url);

    if (projectId === undefined) {
      throw new Response("Project ID is not defined", {
        status: 404,
      });
    }

    const start = Date.now();
    const project = await db.project.loadById(projectId, context);

    if (project === null) {
      throw new Response(`Project "${projectId}" not found`, {
        status: 404,
      });
    }

    const authPermit =
      (await authorizeProject.getProjectPermit(
        {
          projectId: project.id,
          // At this point we already knew that if project loaded we have at least "view" permit
          // having that getProjectPermit is heavy operation we can skip check "view" permit
          permits: ["own", "admin", "build", "edit"] as const,
        },
        context
      )) ?? "view";

    const devBuild = await loadBuildIdAndVersionByProjectId(
      context,
      project.id
    );

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
      throw new Response("User plan features are not defined", {
        status: 404,
      });
    }

    if (project.userId === null) {
      throw new AuthorizationError("Project must have project userId defined");
    }

    const publisherHost = env.PUBLISHER_HOST;

    const headers = new Headers();

    if (context.authorization.type === "token") {
      // To protect against cookie overwrites, we set a null session cookie if a user is using an authToken.
      // This ensures that any existing HttpOnly, secure session cookies cannot be overwritten by client-side scripts

      // See Storage model https://datatracker.ietf.org/doc/html/rfc6265#section-5.3
      // If the cookie store contains a cookie with the same name,
      // domain, and path as the newly created cookie:
      // ...
      // If the newly created cookie was received from a "non-HTTP"
      //  API and the old-cookie's http-only-flag is set, abort these
      //  steps and ignore the newly created cookie entirely.
      const builderSession = await builderSessionStorage.getSession(null);
      headers.set(
        "Set-Cookie",
        await builderSessionStorage.commitSession(builderSession)
      );
    }

    headers.set(
      // Disallowing iframes from loading any content except the canvas
      // Still possible create iframes on canvas itself (but we use credentialless attribute)
      // Still possible create iframe without src attribute
      // Disable workers on builder
      "Content-Security-Policy",
      `frame-src ${url.origin}/canvas https://app.goentri.com/ https://help.webstudio.is/; worker-src 'none'`
    );

    return json(
      {
        project,
        publisherHost,
        build: {
          id: devBuild.id,
          version: devBuild.version,
        },
        authToken,
        authTokenPermissions,
        authPermit,
        userPlanFeatures,
      } as const,
      {
        headers,
      }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      // try to re-login user if he has no access to the project
      throw redirect(`/auth/ws`);
    }

    throw error;
  }
};

/**
 * When doing changes in a project, then navigating to a dashboard then pressing the back button,
 * the builder page may display stale data because it’s being retrieved from the browser’s back/forward cache (bfcache).
 *
 * https://web.dev/articles/bfcache
 *
 */
export const headers = ({ loaderHeaders }: HeadersArgs) => {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": loaderHeaders.get("Content-Security-Policy"),
  };
};

const Builder = lazy(async () => {
  const { Builder } = await import("~/builder/index.client");
  return { default: Builder };
});

const BuilderRoute = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <ClientOnly>
      {/* Using a key here ensures that certain effects are re-executed inside the builder,
      especially in cases like cloning a project */}
      <Builder key={data.project.id} {...data} />
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
