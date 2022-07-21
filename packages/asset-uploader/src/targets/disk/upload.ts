import path from "path";
import sharp from "sharp";
import { create } from "../../";
import { ImagesUpload } from "../../schema";

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
    const sharpImage = sharp(arrayBuffer as Uint8Array);

    const metadata = await sharpImage.metadata();

    const data = {
      name: image.name,
      path: path.join("/", folderInPublic, image.name),
      size: image.size,
      metadata,
    };

    const newAsset = await create(projectId, data);

    return newAsset;
  });

  await Promise.all(allInfo);
};
