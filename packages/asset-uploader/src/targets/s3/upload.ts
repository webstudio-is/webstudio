import {
  type UploadHandlerPart,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Location } from "@webstudio-is/prisma-client";
import { AssetsUploadedSuccess, S3EnvVariables } from "../../schema";
import { toBuffer } from "../../utils/to-buffer";
import { getAssetData } from "../../utils/get-asset-data";
import { create } from "../../db";
import { Asset } from "../../types";
import { getUniqueFilename } from "../../utils/get-unique-filename";
import { getS3Client } from "./client";

const location = Location.REMOTE;

export const uploadToS3 = async ({
  request,
  projectId,
  maxSize,
}: {
  request: Request;
  projectId: string;
  maxSize: number;
}): Promise<Array<Asset>> => {
  const formData = await unstable_parseMultipartFormData(
    request,
    (file: UploadHandlerPart) =>
      uploadHandler({
        file,
        maxSize,
      })
  );

  const imagesFormData = formData.getAll("image") as Array<string>;
  // @todo this could be one aggregated query for perf.
  const assetsData = imagesFormData.map((dataString) => {
    // @todo validate with zod
    const data = JSON.parse(dataString);
    return create(projectId, {
      ...data,
      location,
    });
  });

  return await Promise.all(assetsData);
};

const uploadHandler = async ({
  file,
  maxSize,
}: {
  file: UploadHandlerPart;
  maxSize: number;
}): Promise<string> => {
  if (!file.data) {
    throw new Error("Your asset seems to be empty");
  }

  // @todo this is going to put the entire file in memory
  // this has to be a stream that goes directly to s3
  // Size check has to happen as you stream and interrupted when size is too big
  // Also check if S3 client has an option to check the size limit
  const buffer = await toBuffer(file.data);

  if (buffer.byteLength > maxSize) {
    throw new Error(`Asset cannot be bigger than ${maxSize}MB`);
  }

  const uniqueFilename = getUniqueFilename(file.filename);

  const s3Envs = S3EnvVariables.parse(process.env);

  // if there is no ACL passed we do not default since some providers do not support it
  const ACL = s3Envs.S3_ACL ? { ACL: s3Envs.S3_ACL } : {};

  const params: PutObjectCommandInput = {
    ...ACL,
    Bucket: s3Envs.S3_BUCKET,
    Key: encodeURIComponent(uniqueFilename),
    Body: buffer,
    ContentType: file.contentType,
    Metadata: {
      filename: file.filename || "unnamed",
    },
  };

  const upload = new Upload({ client: getS3Client(), params });

  AssetsUploadedSuccess.parse(await upload.done());

  // @todo fonts
  const assetOptions = {
    type: "image" as const,
    name: uniqueFilename,
    size: buffer.byteLength,
    buffer,
  };

  const assetData = await getAssetData(assetOptions);

  return JSON.stringify(assetData);
};
