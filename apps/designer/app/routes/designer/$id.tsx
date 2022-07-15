import { useLoaderData } from "@remix-run/react";
import path from "path";
import {
  ActionFunction,
  LoaderFunction,
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import type { Project, Asset } from "@webstudio-is/react-sdk";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env from "~/env.server";
import { z } from "zod";
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

type Data = {
  config: typeof config;
  project: Project;
  assets: Asset[];
};

type Error = {
  errors: "string";
};

const ImageUpload = z.object({
  name: z.string(),
  type: z.string(),
});
type ImageUpload = z.infer<typeof ImageUpload>;

export const action: ActionFunction = async ({ request, params }) => {
  const uploads = path.join(__dirname, "../public");
  const folderInPublic = process.env.FILE_UPLOAD_PATH || "uploads";
  const directory = path.join(uploads, folderInPublic);

  if (params.id === undefined) throw new Error("Project id undefined");
  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      unstable_createFileUploadHandler({
        maxPartSize: 10_000_000,
        directory,
        file: ({ filename }) => filename,
      })
    );

    const imageInfo = ImageUpload.parse(formData.get("image"));
    const info = imageInfo as ImageUpload;
    const data = {
      type: info.type,
      name: info.name,
      path: `/${path.join(folderInPublic, info.name)}`,
    };
    db.assets.create(params.id, data);

    return {
      ok: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
};

const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Designer {...data} />;
};

export default DesignerRoute;
