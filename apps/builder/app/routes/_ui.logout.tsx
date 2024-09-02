import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { authenticator } from "~/services/auth.server";
import { builderUrl, isDashboard, loginPath } from "~/shared/router-utils";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createCallerFactory } from "@webstudio-is/trpc-interface/index.server";
import { logoutRouter } from "~/services/logout-router.server";
import { createContext } from "~/shared/context.server";
import { redirect, type ActionFunctionArgs } from "react-router-dom";
import { ClientOnly } from "~/shared/client-only";
import { useLoaderData, type MetaFunction } from "@remix-run/react";
import { lazy, useRef } from "react";

const logoutCaller = createCallerFactory(logoutRouter);

const debug = createDebug(import.meta.url);

export const meta: MetaFunction<typeof loader> = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Logout" });

  return metas;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (false === isDashboard(request)) {
    throw new Error("Only Dashboard can logout at this endpoint");
  }

  preventCrossOriginCookie(request);

  const context = await createContext(request);

  const redirectTo = loginPath({});

  if (context.authorization.userId === undefined) {
    debug("User is not logged in redirecting to", redirectTo);
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

export const action = async ({ request }: ActionFunctionArgs) => {
  if (false === isDashboard(request)) {
    throw new Error("Only Dashboard can logout at this endpoint");
  }

  preventCrossOriginCookie(request);

  const redirectTo = loginPath({});
  await authenticator.logout(request, {
    redirectTo,
  });
};

const LogoutPage = lazy(async () => {
  const { LogoutPage } = await import("~/shared/logout.client");
  return { default: LogoutPage };
});

export default function Logout() {
  const data = useLoaderData<typeof loader>();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <ClientOnly>
      <form action={"/logout"} method="post" ref={formRef}>
        <LogoutPage
          logoutUrls={data.logoutUrls}
          onFinish={() => {
            formRef.current?.submit();
          }}
        />
      </form>
    </ClientOnly>
  );
}
