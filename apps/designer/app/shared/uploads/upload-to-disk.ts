import type { ImagesUpload } from "~/designer/features/sidebar-left/types";
import * as db from "~/shared/db";
import path from "path";

export const uploadToDisk = async ({
  formData,
  projectId,
  folderInPublic,
}: {
  formData: FormData;
  projectId: string;
  folderInPublic: string;
}) => {
  const imagesInfo = ImagesUpload.parse(formData.getAll("image"));
  const allInfo = imagesInfo.map(async (image) => {
    const arrayBuffer = await image.arrayBuffer();
    const data = {
      name: image.name,
      path: path.join("/", folderInPublic, image.name),
      size: image.size,
      arrayBuffer,
    };

    const newAsset = await db.assets.create(projectId, data);

    return newAsset;
  });

  await Promise.all(allInfo);
};
