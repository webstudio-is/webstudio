import { create } from "../../";

export const uploadToS3 = async ({
  formData,
  projectId,
}: {
  formData: FormData;
  projectId: string;
}) => {
  const imagesInfo = formData.getAll("image") as Array<string>;
  const allInfo = imagesInfo.map(async (image) => {
    const uploadedImage = JSON.parse(image);
    const newAsset = await create(projectId, uploadedImage);
    return newAsset;
  });
  return await Promise.all(allInfo);
};
