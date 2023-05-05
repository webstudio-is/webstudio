-- CreateTable
CREATE TABLE "File" (
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "status" "UploadStatus" NOT NULL DEFAULT 'UPLOADING',

    CONSTRAINT "File_pkey" PRIMARY KEY ("name")
);
