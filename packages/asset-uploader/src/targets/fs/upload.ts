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
import { sanitizeS3Key } from "../../utils/sanitize-s3-key";

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
    file: ({ filename }) => getUniqueFilename(sanitizeS3Key(filename)),
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  const formDataImages = AssetsFromFs.parse(formData.getAll("image"));
  const formDataFonts = AssetsFromFs.parse(formData.getAll("font"));
  const formDataAll = [...formDataImages, ...formDataFonts];

  const assets = formDataAll.map(async (asset) =>
    getAssetData({
      type: formDataFonts.includes(asset) ? "font" : "image",
      name: asset.name,
      size: asset.size,
      data: new Uint8Array(await asset.arrayBuffer()),
      location: Location.FS,
    })
  );

  const assetsData = await Promise.all(assets);

  return await createMany(projectId, assetsData);
};
