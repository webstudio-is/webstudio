import { z } from "zod";
import {
  unstable_parseMultipartFormData,
  unstable_createFileUploadHandler,
  NodeOnDiskFile,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { getAssetData } from "../../utils/get-asset-data";
import { createMany } from "../../db";
import { FILE_DIRECTORY } from "./file-path";
import { Asset } from "../../types";
import { getUniqueFilename } from "../../utils/get-unique-filename";

const AssetsFromFs = z.array(z.instanceof(NodeOnDiskFile));

export const uploadToFs = async ({
  request,
  projectId,
  maxSize,
}: {
  request: Request;
  projectId: string;
  maxSize: number;
}): Promise<Array<Asset>> => {
  const uploadHandler = await unstable_createFileUploadHandler({
    maxPartSize: maxSize,
    directory: FILE_DIRECTORY,
    file: ({ filename }) => getUniqueFilename(filename),
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  const formDataImages = AssetsFromFs.parse(formData.getAll("image"));

  // @todo fonts
  const assets = formDataImages.map(async (asset) =>
    getAssetData({
      type: "image" as const,
      name: asset.name,
      size: asset.size,
      buffer: (await asset.arrayBuffer()) as Uint8Array,
      location: Location.FS,
    })
  );

  const assetsData = await Promise.all(assets);

  return await createMany(projectId, assetsData);
};
