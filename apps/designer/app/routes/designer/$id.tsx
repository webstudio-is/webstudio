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
import { ImagesUpload } from "~/designer/features/sidebar-left/types";
import { s3UploadHandler } from "~/shared/uploads/s3-upload-handler";
import { sentryException } from "~/shared/sentry";
import { uploadToS3 } from "~/shared/uploads/upload-to-s3";
import { uploadToDisk } from "~/shared/uploads/upload-to-disk";

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

export const action: ActionFunction = async ({ request, params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const IS_S3_UPLOAD =
    process.env.S3_ENDPOINT &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_ACCESS_KEY_ID;
  const uploads = path.join(__dirname, "../public");
  const folderInPublic =
    process.env.FILE_UPLOAD_PATH || config.defaultUploadPath;
  const directory = path.join(uploads, folderInPublic);
  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      IS_S3_UPLOAD
        ? (file) => s3UploadHandler(file)
        : unstable_createFileUploadHandler({
            maxPartSize: 10_000_000,
            directory,
            file: ({ filename }) => filename,
          })
    );
    const projectId = params.id as string;
    if (IS_S3_UPLOAD) {
      await uploadToS3({
        projectId,
        formData,
      });
    } else {
      await uploadToDisk({
        projectId,
        formData,
        folderInPublic,
      });
    }

    return {
      ok: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      sentryException({
        message: error.message,
      });
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
