import {
  unstable_parseMultipartFormData,
  unstable_createFileUploadHandler,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { AssetsFromFs } from "../../schema";
import { getAssetData } from "../../utils/get-asset-data";
import { create } from "../../db";
import { FILE_DIRECTORY } from "./file-path";
import { Asset } from "../../types";
import { getUniqueFilename } from "../../utils/get-unique-filename";

const location = Location.FS;

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
    })
  );

  const assetsData = await Promise.all(assets);

  // @todo this could be one aggregated query for perf.
  const savedAssetsData = assetsData.map((data) => {
    return create(projectId, {
      ...data,
      location,
    });
  });

  return await Promise.all(savedAssetsData);
};
