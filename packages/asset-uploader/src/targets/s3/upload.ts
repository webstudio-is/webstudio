import { z } from "zod";
import {
  type UploadHandlerPart,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Location } from "@webstudio-is/prisma-client";
import { S3EnvVariables } from "../../schema";
import { toUint8Array } from "../../utils/to-uint8-array";
import { getAssetData } from "../../utils/get-asset-data";
import { createMany } from "../../db";
import type { Asset } from "../../types";
import { getUniqueFilename } from "../../utils/get-unique-filename";
import { getS3Client } from "./client";

const AssetsUploadedSuccess = z.object({
  Location: z.string(),
});

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
  const fontsFormData = formData.getAll("font") as Array<string>;
  const assetsData = [...imagesFormData, ...fontsFormData].map((dataString) => {
    // @todo validate with zod
    return JSON.parse(dataString);
  });

  return await createMany(projectId, assetsData);
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
  const data = await toUint8Array(file.data);

  if (data.byteLength > maxSize) {
    throw new Error(`Asset cannot be bigger than ${maxSize}MB`);
  }

  if (file.filename === undefined) {
    throw new Error("Filename is required");
  }

  const uniqueFilename = getUniqueFilename(file.filename);

  const s3Envs = S3EnvVariables.parse(process.env);

  // if there is no ACL passed we do not default since some providers do not support it
  const ACL = s3Envs.S3_ACL ? { ACL: s3Envs.S3_ACL } : {};

  const params: PutObjectCommandInput = {
    ...ACL,
    Bucket: s3Envs.S3_BUCKET,
    Key: encodeURIComponent(uniqueFilename),
    Body: data,
    ContentType: file.contentType,
    Metadata: {
      filename: file.filename || "unnamed",
    },
  };

  const upload = new Upload({ client: getS3Client(), params });

  AssetsUploadedSuccess.parse(await upload.done());

  const type = file.contentType.startsWith("image")
    ? ("image" as const)
    : ("font" as const);

  const baseAssetOptions = {
    name: uniqueFilename,
    size: data.byteLength,
    data,
    location: Location.REMOTE,
  };
  let assetOptions;

  if (type === "image") {
    assetOptions = {
      type,
      ...baseAssetOptions,
    };
  } else if (type === "font") {
    assetOptions = {
      type,
      ...baseAssetOptions,
    };
  }

  if (assetOptions === undefined) {
    throw new Error("Asset type not supported");
  }

  const assetData = await getAssetData(assetOptions);

  return JSON.stringify(assetData);
};
