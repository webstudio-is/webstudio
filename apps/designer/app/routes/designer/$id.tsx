import { useLoaderData } from "@remix-run/react";
import {
  ActionFunction,
  LoaderFunction,
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import type { Project } from "@webstudio-is/react-sdk";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env from "~/env.server";
import { Asset } from "@prisma/client";
export { links };

export const loader: LoaderFunction = async ({ params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadById(params.id);
  const assets = await db.assets.loadByProject(params.id);
  if (project === null) {
    return { errors: `Project "${params.id}" not found` };
  }
  return { config, assets, project, env };
};

const directory = "./public/uploads";

type Data = {
  config: typeof config;
  project: Project;
  assets: Asset[];
};

type Error = {
  errors: "string";
};

type ImageUpload = {
  type: string;
  name: string;
};

export const action: ActionFunction = async ({ request, params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const formData = await unstable_parseMultipartFormData(
    request,
    unstable_createFileUploadHandler({
      maxPartSize: 10_000_000,
      directory,
      file: ({ filename }) => filename,
    })
  );
  const imageInfo = formData.get("image") as ImageUpload;
  if (imageInfo) {
    const data = {
      type: imageInfo.type,
      name: imageInfo.name,
      path: `/uploads/${imageInfo.name}`,
    };
    db.assets.create(params.id, data);
  }
  return "lol";
};

const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Designer {...data} />;
};

export default DesignerRoute;
