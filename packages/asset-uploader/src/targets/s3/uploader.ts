export const uploadToS3 = async ({
  formData,
  projectId,
  db,
}: {
  formData: FormData;
  projectId: string;
  db: any;
}) => {
  try {
    const imagesInfo = formData.getAll("image") as Array<string>;
    const allInfo = imagesInfo.map(async (image) => {
      const uploadedImage = JSON.parse(image);
      const newAsset = await db.assets.create(projectId, uploadedImage);
      return newAsset;
    });
    await Promise.all(allInfo);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
  }
};
