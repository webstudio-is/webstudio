import { type LoaderFunction, redirect, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { InstanceRoot, Root } from "@webstudio-is/react-sdk";
import { loadCanvasData, type CanvasData } from "~/shared/db";
import config from "~/config";
import { db } from "@webstudio-is/project/index.server";
import env, { Env } from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { Canvas } from "~/canvas";

type Mode = "edit" | "preview" | "published";

type Data =
  | (CanvasData & { env: Env; mode: Mode })
  | { errors: string; env: Env };

type ProjectIdentifier = { type: "id" | "domain"; value: string };

export const isCanvasRequest = (
  request: Request
): false | { projectId: ProjectIdentifier; mode: Mode; pathname: string } => {
  const url = new URL(request.url);

  const pathname = url.pathname;

  if (Object.values(config).some((path) => pathname.startsWith(path))) {
    return false;
  }

  let projectId: ProjectIdentifier | undefined = undefined;

  // @todo all this subdomain logic is very hacky
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const [userDomain, wstdDomain] = host.split(".");
  if (wstdDomain === "wstd" || wstdDomain?.includes("localhost")) {
    projectId = { type: "domain", value: userDomain };
  }

  if (projectId === undefined) {
    const projectIdParam = url.searchParams.get("projectId");
    if (projectIdParam !== null) {
      projectId = { type: "id", value: projectIdParam };
    }
  }

  if (projectId === undefined) {
    return false;
  }

  const modeParam = url.searchParams.get("mode");

  if (modeParam === "edit") {
    return { projectId, mode: "edit", pathname };
  }

  if (modeParam === "preview") {
    return { projectId, mode: "preview", pathname };
  }

  return { projectId, mode: "published", pathname };
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
    const canvasRequest = isCanvasRequest(request);

    if (canvasRequest === false) {
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
    return <p>{data.errors}</p>;
  }

  const Outlet =
    data.mode === "edit"
      ? () => <Canvas data={data} />
      : () => <InstanceRoot data={data} />;

  // @todo This is non-standard for Remix, is there a better way?
  // We need to render essentially the preview route but from the index,
  // so we have to know the layout and the outlet from here.
  // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
  return <Root Outlet={Outlet} />;
};

export default Content;
