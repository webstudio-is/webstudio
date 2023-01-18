import { useLoaderData } from "@remix-run/react";
import {
  ErrorBoundaryComponent,
  LoaderArgs,
  redirect,
  TypedResponse,
} from "@remix-run/node";
import { type DesignerProps, Designer, links } from "~/designer";
import { db } from "@webstudio-is/project/server";
import { ErrorMessage } from "~/shared/error";
import { sentryException } from "~/shared/sentry";
import { authPath, getBuildOrigin, loginPath } from "~/shared/router-utils";
import { findAuthenticatedUser, linkStrategy } from "~/services/auth.server";

export { links };

export const loader = async ({
  params,
  request,
}: LoaderArgs): Promise<DesignerProps | TypedResponse<never>> => {
  const user = await findAuthenticatedUser(request);

  if (user === null) {
    const url = new URL(request.url);
    return redirect(
      loginPath({
        returnTo: url.pathname,
      })
    );
  }

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

  const buildOrigin = getBuildOrigin(request);

  const canvasEditSecureUrl = new URL(
    authPath({ provider: "link" }),
    buildOrigin
  );
  const tokenSearchParams = await linkStrategy.createTokenSearchParams(
    user.id,
    "1m"
  );
  for (const entry of tokenSearchParams.entries()) {
    canvasEditSecureUrl.searchParams.set(entry[0], entry[1]);
  }

  return {
    project,
    pages: devBuild.pages,
    pageId: pageIdParam || devBuild.pages.homePage.id,
    buildOrigin: getBuildOrigin(request),
    canvasEditSecureUrl: canvasEditSecureUrl.href,
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
