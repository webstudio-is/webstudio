import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { builderUrl, isDashboard, loginPath } from "~/shared/router-utils";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createCallerFactory } from "@webstudio-is/trpc-interface/index.server";
import { logoutRouter } from "~/services/logout-router.server";
import { createContext } from "~/shared/context.server";
import { redirect } from "react-router-dom";
import { ClientOnly } from "~/shared/client-only";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { lazy } from "react";
import { allowedDestinations } from "~/services/destinations.server";
export { ErrorBoundary } from "~/shared/error/error-boundary";

const logoutCaller = createCallerFactory(logoutRouter);

const debug = createDebug(import.meta.url);

export const meta: MetaFunction<typeof loader> = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Logout" });

  return metas;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (false === isDashboard(request)) {
    throw new Response("Not found", {
      status: 404,
    });
  }

  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.

  const context = await createContext(request);

  const redirectTo = loginPath({});

  if (context.authorization.type !== "user") {
    debug("User is not logged in, redirecting to", redirectTo);
    throw redirect(redirectTo);
  }

  try {
    const buildProjectIdsToLogout =
      await logoutCaller(context).getLoggedInProjectIds();

    debug("buildProjectIdsToLogout", buildProjectIdsToLogout);

    const url = new URL(request.url);
    const logoutUrls = buildProjectIdsToLogout.map(
      (projectId) =>
        `${builderUrl({ projectId, origin: url.origin })}builder-logout`
    );

    return json({
      redirectTo,
      logoutUrls,
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    console.error(error);
    throw error;
  }
};

const LogoutPage = lazy(async () => {
  const { LogoutPage } = await import("~/shared/logout.client");
  return { default: LogoutPage };
});

export default function Logout() {
  const data = useLoaderData<typeof loader>();

  return (
    <ClientOnly>
      <LogoutPage logoutUrls={data.logoutUrls} />
    </ClientOnly>
  );
}
