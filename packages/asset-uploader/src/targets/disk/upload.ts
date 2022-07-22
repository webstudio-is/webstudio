import sharp from "sharp";
import { create } from "../../";
import { ImagesUpload } from "../../schema";

export const uploadToDisk = async ({
  formData,
  projectId,
}: {
  formData: FormData;
  projectId: string;
}) => {
  const imagesInfo = ImagesUpload.parse(formData.getAll("image"));
  const allInfo = imagesInfo.map(async (image) => {
    const arrayBuffer = await image.arrayBuffer();
    const sharpImage = sharp(arrayBuffer as Uint8Array);

    const metadata = await sharpImage.metadata();

    const data = {
      name: image.name,
      size: image.size,
      metadata,
      location: "FS" as "FS" | "REMOTE",
    };

    const newAsset = await create(projectId, data);

    return newAsset;
  });

  await Promise.all(allInfo);
};
