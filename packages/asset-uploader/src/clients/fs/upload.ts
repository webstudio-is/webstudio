import { z } from "zod";
import {
  unstable_parseMultipartFormData as parseMultipartFormData,
  unstable_createFileUploadHandler as createFileUploadHandler,
  NodeOnDiskFile,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { AssetData, getAssetData } from "../../utils/get-asset-data";

const AssetsFromFs = z.array(z.instanceof(NodeOnDiskFile));

/**
 * Do not change. Upload code assumes its 1.
 */
const MAX_FILES_PER_REQUEST = 1;

export const uploadToFs = async ({
  request,
  maxSize,
  fileDirectory,
}: {
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

  const formDataImages = AssetsFromFs.parse(formData.getAll("image"));
  const formDataFonts = AssetsFromFs.parse(formData.getAll("font"));
  const formDataAll = [...formDataImages, ...formDataFonts].slice(
    0,
    MAX_FILES_PER_REQUEST
  );

  const assets = formDataAll.map(async (asset) =>
    getAssetData({
      type: formDataFonts.includes(asset) ? "font" : "image",
      size: asset.size,
      data: new Uint8Array(await asset.arrayBuffer()),
      location: Location.FS,
    })
  );

  const assetsData = await Promise.all(assets);

  return assetsData[0];
};
