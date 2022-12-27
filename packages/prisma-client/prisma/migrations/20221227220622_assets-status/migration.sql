-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADING', 'UPLOADED');

-- This field is necessary to be able to limit the number of Assets in the project.
ALTER TABLE "Asset" ADD COLUMN     "status" "UploadStatus" NOT NULL DEFAULT 'UPLOADED';
