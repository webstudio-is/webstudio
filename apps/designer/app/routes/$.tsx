import { type LoaderFunction, redirect, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { loadCanvasData, type CanvasData } from "~/shared/db";
import config from "~/config";
import { db } from "@webstudio-is/project/index.server";
import env, { Env } from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";
import { ErrorMessage } from "~/shared/error";

type Mode = "edit" | "preview" | "published";

type Data =
  | (CanvasData & { env: Env; mode: Mode })
  | { errors: string; env: Env };

type ProjectIdentifier = { type: "id" | "domain"; value: string };

export const getCanvasRequestParams = (
  request: Request
):
  | { projectIdObject: ProjectIdentifier; mode: Mode; pathname: string }
  | undefined => {
  const url = new URL(request.url);

  const pathname = url.pathname;

  if (Object.values(config).some((path) => pathname.startsWith(path))) {
    return undefined;
  }

  let projectIdObject: ProjectIdentifier | undefined = undefined;

  // @todo all this subdomain logic is very hacky
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const [userDomain, wstdDomain] = host.split(".");
  if (wstdDomain === "wstd" || wstdDomain?.includes("localhost")) {
    projectIdObject = { type: "domain", value: userDomain };
  }

  if (projectIdObject === undefined) {
    const projectIdParam = url.searchParams.get("projectId");
    if (projectIdParam !== null) {
      projectIdObject = { type: "id", value: projectIdParam };
    }
  }

  if (projectIdObject === undefined) {
    return undefined;
  }

  const modeParam = url.searchParams.get("mode");

  if (modeParam === "edit") {
    return { projectIdObject, mode: "edit", pathname };
  }

  if (modeParam === "preview") {
    return { projectIdObject, mode: "preview", pathname };
  }

  return { projectIdObject, mode: "published", pathname };
};

export const meta: MetaFunction = ({ data }: { data: Data }) => {
  if ("errors" in data) {
    return { title: "Error" };
  }
  const { page } = data;
  return { title: page.title, ...page.meta };
};

export const loader: LoaderFunction = async ({
  request,
}): Promise<Data | Response> => {
  try {
    const canvasRequest = getCanvasRequestParams(request);

    if (canvasRequest === undefined) {
      return redirect(config.dashboardPath);
    }

    const { projectId, mode, pathname } = canvasRequest;

    const project =
      projectId.type === "id"
        ? await db.project.loadById(projectId.value)
        : await db.project.loadByDomain(projectId.value);

    if (project === null) {
      throw new Error("Project not found");
    }

    const canvasData = await loadCanvasData(
      project.id,
      mode === "published" ? "prod" : "dev",
      pathname
    );

    return { ...canvasData, env, mode };
  } catch (error) {
    sentryException({ error });
    return {
      errors: error instanceof Error ? error.message : String(error),
      env,
    };
  }
};

const Content = () => {
  const data = useLoaderData<Data>();

  if ("errors" in data) {
    return <ErrorMessage message={data.errors} />;
  }

  const Outlet =
    data.mode === "edit"
      ? () => <Canvas data={data} />
      : () => <InstanceRoot data={data} />;

  // @todo This is non-standard for Remix, is there a better way?
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
