-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('uploading', 'uploaded');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "status" "UploadStatus" NOT NULL DEFAULT 'uploaded';
