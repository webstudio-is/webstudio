import { useLoaderData } from "@remix-run/react";
import type {
  ActionArgs,
  ErrorBoundaryComponent,
  LoaderArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Dashboard } from "~/dashboard";
import { findAuthenticatedUser } from "~/services/auth.server";
import { designerPath, loginPath } from "~/shared/router-utils";
import { ComponentProps } from "react";
import { prisma } from "@webstudio-is/prisma-client";
import { zfd } from "zod-form-data";
import { db } from "@webstudio-is/project/server";
import { sentryException } from "~/shared/sentry";
import { ErrorMessage } from "~/shared/error";

export { links } from "~/dashboard";

type Data = ComponentProps<typeof Dashboard>;

export const loader = async ({ request }: LoaderArgs) => {
  const user = await findAuthenticatedUser(request);

  if (!user) {
    const url = new URL(request.url);
    return redirect(
      loginPath({
        returnTo: url.pathname,
      })
    );
  }

  const projects = await prisma.dashboardProject.findMany({
    where: {
      userId: user.id,
    },
  });

  return json({ user, projects });
};

const projectTitleSchema = zfd.formData({
  project: zfd.text(),
});

export const action = async ({ request }: ActionArgs) => {
  const { project: title } = projectTitleSchema.parse(await request.formData());

  const authenticatedUser = await findAuthenticatedUser(request);

  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }

  const project = await db.project.create({
    title,
    userId: authenticatedUser?.id,
  });

  if ("errors" in project) {
    return project;
  }

  return redirect(designerPath({ projectId: project.id }));
};

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  sentryException({ error });
  const message = error instanceof Error ? error.message : String(error);
  return <ErrorMessage message={message} />;
};

const DashboardRoute = () => {
  const data = useLoaderData<Data>();
  return <Dashboard {...data} />;
};

export default DashboardRoute;
