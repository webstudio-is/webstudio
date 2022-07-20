export const uploadToS3 = async ({
  formData,
  projectId,
  db,
}: {
  formData: FormData;
  projectId: string;
  // @todo Stop passing db here
  db: any;
}) => {
  const imagesInfo = formData.getAll("image") as Array<string>;
  const allInfo = imagesInfo.map(async (image) => {
    const uploadedImage = JSON.parse(image);
    const newAsset = await db.assets.create(projectId, uploadedImage);
    return newAsset;
  });
  return await Promise.all(allInfo);
};
