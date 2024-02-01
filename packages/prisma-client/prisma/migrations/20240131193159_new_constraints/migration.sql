-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_previewImageAssetId_id_fkey";

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_previewImageAssetId_id_fkey" FOREIGN KEY ("previewImageAssetId", "id") REFERENCES "Asset"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;
