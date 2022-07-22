import { UploadHandlerPart } from "@remix-run/node";
import { PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
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
    throw new Error(`Your asset cannot be bigger than ${MAX_UPLOAD_SIZE}mb`);
  }

  const [name, extension] = getFilenameAndExtension(filename);
  const key = `${name}_${Date.now()}.${extension}`;

  // r2 does not have ACL support so in that case we pass nothing there
  const ACL = s3Envs.WORKER_URL ? {} : { ACL: s3Envs.S3_ACL };

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

  const client = new S3Client({
    endpoint: s3Envs.S3_ENDPOINT,
    region: s3Envs.S3_REGION,
    credentials: {
      accessKeyId: s3Envs.S3_ACCESS_KEY_ID,
      secretAccessKey: s3Envs.S3_SECRET_ACCESS_KEY,
    },
  });

  const upload = new Upload({ client, params });

  ImagesUploadedSuccess.parse(await upload.done());
  const image = sharp(uint8Array);
  const metadata = await image.metadata();

  // these upload handlers only allow strings to be returned
  return JSON.stringify({
    metadata,
    name: key,
    location: "REMOTE",
  });
};
