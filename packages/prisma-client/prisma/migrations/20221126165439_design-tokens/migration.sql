-- CreateTable
CREATE TABLE "DesignTokens" (
    "buildId" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "DesignTokens_pkey" PRIMARY KEY ("buildId")
);

-- AddForeignKey
ALTER TABLE "DesignTokens" ADD CONSTRAINT "DesignTokens_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
