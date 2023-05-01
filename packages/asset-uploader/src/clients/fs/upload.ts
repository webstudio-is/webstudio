import { z } from "zod";
import {
  unstable_parseMultipartFormData as parseMultipartFormData,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  unstable_createFileUploadHandler as createFileUploadHandler,
  NodeOnDiskFile,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { AssetData, getAssetData } from "../../utils/get-asset-data";
import { idsFormDataFieldName } from "../../schema";
import { getUniqueFilename } from "../../utils/get-unique-filename";
import { sanitizeS3Key } from "../../utils/sanitize-s3-key";

const AssetsFromFs = z.array(z.instanceof(NodeOnDiskFile));
const Ids = z.array(z.string().uuid());

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
    file: ({ filename }) => getUniqueFilename(sanitizeS3Key(filename)),
  });

  const formData = await parseMultipartFormData(
    request,
    composeUploadHandlers(
      uploadHandler,
      createMemoryUploadHandler({
        filter: ({ name }) => name === idsFormDataFieldName,
      })
    )
  );

  const formDataImages = AssetsFromFs.parse(formData.getAll("image"));
  const formDataFonts = AssetsFromFs.parse(formData.getAll("font"));
  const formDataAll = [...formDataImages, ...formDataFonts].slice(
    0,
    MAX_FILES_PER_REQUEST
  );
  const ids = Ids.parse(formData.getAll(idsFormDataFieldName));

  const assets = formDataAll.map(async (asset, index) =>
    getAssetData({
      id: ids[index],
      type: formDataFonts.includes(asset) ? "font" : "image",
      name: asset.name,
      size: asset.size,
      data: new Uint8Array(await asset.arrayBuffer()),
      location: Location.FS,
    })
  );

  const assetsData = await Promise.all(assets);

  return assetsData[0];
};
