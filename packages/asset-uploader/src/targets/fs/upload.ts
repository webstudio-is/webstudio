import { z } from "zod";
import {
  unstable_parseMultipartFormData as unstableParseMultipartFormData,
  unstable_createFileUploadHandler as unstableCreateFileUploadHandler,
  unstable_composeUploadHandlers as unstableComposeUploadHandlers,
  NodeOnDiskFile,
} from "@remix-run/node";
import { Location } from "@webstudio-is/prisma-client";
import { getAssetData } from "../../utils/get-asset-data";
import { createAssetWithLimit } from "../../db";
import { FILE_DIRECTORY } from "./file-path";
import { Asset, idsFormDataFieldName } from "../../schema";
import { getUniqueFilename } from "../../utils/get-unique-filename";
import { sanitizeS3Key } from "../../utils/sanitize-s3-key";
import { uuidHandler } from "../../utils/uuid-handler";

const AssetsFromFs = z.array(z.instanceof(NodeOnDiskFile));
const Ids = z.array(z.string().uuid());

/**
 * Do not change. Upload code assumes its 1.
 */
const MAX_FILES_PER_REQUEST = 1;

export const uploadToFs = async ({
  request,
  projectId,
  maxSize,
}: {
  request: Request;
  projectId: string;
  maxSize: number;
}): Promise<Array<Asset>> => {
  const asset = await createAssetWithLimit(projectId, async () => {
    const uploadHandler = await unstableCreateFileUploadHandler({
      maxPartSize: maxSize,
      directory: FILE_DIRECTORY,
      file: ({ filename }) => getUniqueFilename(sanitizeS3Key(filename)),
    });

    const formData = await unstableParseMultipartFormData(
      request,
      unstableComposeUploadHandlers(uploadHandler, uuidHandler)
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
  });

  return [asset];
};
