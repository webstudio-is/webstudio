import { UploadHandlerPart } from "@remix-run/node";
import { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import ObjectID from "bson-objectid";

import sharp from "sharp";
import {
  assetEnvVariables,
  ImagesUploadedSuccess,
  s3EnvVariables,
} from "../../schema";
import {
  getArrayBufferFromIterable,
  getFilenameAndExtension,
} from "../../helpers/array-buffer-helpers";
import { Location } from "@webstudio-is/prisma-client";
import { getS3Client } from "./client";

type S3UploadHandler = ({
  file,
  maxPartSize,
}: {
  file: UploadHandlerPart;
  maxPartSize: number;
}) => Promise<string>;

export const s3UploadHandler: S3UploadHandler = async ({
  file: { data, filename: baseFileName, contentType },
  maxPartSize,
}) => {
  const s3Envs = s3EnvVariables.parse(process.env);
  const { MAX_UPLOAD_SIZE } = assetEnvVariables.parse(process.env);
  if (!data) {
    throw new Error("Your asset seems to be empty");
  }
  const filename = baseFileName ?? ObjectID().toString();

  const uint8Array = await getArrayBufferFromIterable(data);

  if (uint8Array.byteLength > maxPartSize) {
    throw new Error(`Asset cannot be bigger than ${MAX_UPLOAD_SIZE}MB`);
  }

  const [name, extension] = getFilenameAndExtension(filename);
  const key = encodeURI(`${name}_${Date.now()}.${extension}`);

  // if there is no ACL passed we do not default since some providers do not support it
  const ACL = s3Envs.S3_ACL ? { ACL: s3Envs.S3_ACL } : {};

  const params: PutObjectCommandInput = {
    Bucket: s3Envs.S3_BUCKET,
    ...ACL,
    Key: key,
    Body: uint8Array,
    ContentType: contentType,
    Metadata: {
      filename,
    },
  };

  const upload = new Upload({ client: getS3Client(), params });

  ImagesUploadedSuccess.parse(await upload.done());
  const image = sharp(uint8Array);
  const metadata = await image.metadata();

  // these upload handlers only allow strings to be returned
  return JSON.stringify({
    metadata,
    name: key,
    location: Location.REMOTE,
  });
};
