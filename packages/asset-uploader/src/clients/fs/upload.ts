import { z } from "zod";
import {
  unstable_parseMultipartFormData as parseMultipartFormData,
  unstable_createFileUploadHandler as createFileUploadHandler,
  NodeOnDiskFile,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { AssetData, getAssetData } from "../../utils/get-asset-data";

const AssetFromFs = z.instanceof(NodeOnDiskFile);

export const uploadToFs = async ({
  name,
  type,
  request,
  maxSize,
  fileDirectory,
}: {
  name: string;
  type: string;
  request: Request;
  maxSize: number;
  fileDirectory: string;
}): Promise<AssetData> => {
  const uploadHandler = createFileUploadHandler({
    maxPartSize: maxSize,
    directory: fileDirectory,
    file: ({ filename }) => filename,
  });

  const formData = await parseMultipartFormData(request, uploadHandler);

  const file = AssetFromFs.parse(formData.get("file"));

  const assetData = await getAssetData({
    type: type.startsWith("image") ? "image" : "font",
    size: file.size,
    data: new Uint8Array(await file.arrayBuffer()),
    location: Location.FS,
  });

  return assetData;
};
